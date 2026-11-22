import React, { useEffect, useRef, useState } from "react";
import { Download, History, LogOut, Trash2, Upload, X } from "lucide-react";
import { api, base64ToBlob, fileToBase64, friendlyError } from "../lib/api";
import {
  ALLOWED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE,
  addMonths,
  encodeProductNotes,
  localDateString,
  normalizeCategory,
} from "../lib/warranty";
import type { BackupFilePayload, User, WarrantyProduct } from "../types";

interface SettingsModalProps {
  open: boolean;
  user: User;
  products: WarrantyProduct[];
  appVersion: string;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
  onPasswordChanged: () => void;
  onAccountDeleted: () => void;
  onSignOut: () => void;
  onOpenVersions: () => void;
  onReloadProducts: () => Promise<void>;
  onToast: (message: string) => void;
  onRequestConfirm: (opts: {
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "default";
    onConfirm: () => Promise<void> | void;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  user,
  products,
  appVersion,
  onClose,
  onUserUpdated,
  onPasswordChanged,
  onAccountDeleted,
  onSignOut,
  onOpenVersions,
  onReloadProducts,
  onToast,
  onRequestConfirm,
}) => {
  const [name, setName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user.full_name || "");
    setEmail(user.email || "");
    setPassword("");
    setError(null);
  }, [open, user]);

  if (!open) return null;

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password && password.length < 10) {
      setError("A nova senha precisa ter pelo menos 10 caracteres.");
      return;
    }

    const emailChanged = trimmedEmail !== (user.email || "");
    const nameChanged = trimmedName !== (user.full_name || "");
    if (!emailChanged && !nameChanged && !password) {
      onClose();
      onToast("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);
    try {
      if (emailChanged) {
        await api("request_email_change", { email: trimmedEmail });
      }
      const res = await api<{ password_changed?: boolean }>("account_update", {
        full_name: trimmedName,
        password,
      });

      if (res.password_changed) {
        onClose();
        onPasswordChanged();
        return;
      }

      onUserUpdated({ ...user, full_name: trimmedName });
      setPassword("");
      onClose();
      onToast(
        emailChanged
          ? "Enviamos um link para confirmar o novo e-mail."
          : "Dados da conta atualizados."
      );
    } catch (err) {
      setError(friendlyError(err, "Não foi possível atualizar os dados da conta."));
    } finally {
      setSaving(false);
    }
  }

  async function handleExportBackup() {
    setExporting(true);
    try {
      const backupProducts = await Promise.all(
        products.map(async (product) => {
          const {
            id: _id,
            user_id: _uid,
            created_at: _c,
            updated_at: _u,
            daysRemaining: _dr,
            status: _st,
            progressPercent: _pp,
            plainNotes: _pn,
            ...fields
          } = product;

          let receipt = null;
          if (product.receipt_path) {
            const signed = await api<{ url: string }>("receipt_signed_url", {
              path: product.receipt_path,
            });
            const response = await fetch(signed.url);
            if (!response.ok) throw new Error("Falha ao baixar comprovante.");
            const blob = await response.blob();
            receipt = {
              name: product.receipt_path.split("/").pop() || "comprovante",
              type: blob.type || "application/octet-stream",
              data: await fileToBase64(blob),
            };
          }
          return { ...fields, receipt };
        })
      );

      const backup: BackupFilePayload = {
        app: "Garantia By BoRan Studio",
        version: 1,
        exportedAt: new Date().toISOString(),
        products: backupProducts,
      };
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `garantia-backup-${localDateString()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onToast("Backup exportado, incluindo os comprovantes.");
    } catch (err) {
      onToast(friendlyError(err, "Não foi possível exportar o backup."));
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(file: File) {
    try {
      const backup = JSON.parse(await file.text()) as BackupFilePayload;
      if (
        !["Garantia", "Garantia By BoRan Studio", "Garantia By Borges & Rangel"].includes(backup.app) ||
        !Array.isArray(backup.products)
      ) {
        throw new Error("Esse arquivo não parece ser um backup do Garantia.");
      }

      onRequestConfirm({
        title: "Importar backup",
        description: `Importar ${backup.products.length} produto(s) para sua conta? Os produtos já cadastrados serão mantidos.`,
        confirmLabel: "Importar produtos",
        tone: "default",
        onConfirm: async () => {
          setImporting(true);
          const rows: Array<Record<string, unknown>> = [];
          const uploadedPaths: string[] = [];

          try {
            for (const item of backup.products) {
              const purchaseDate = item.purchase_date || item.purchaseDate;
              const warrantyMonths = Number(item.warranty_months ?? item.warrantyMonths);
              if (
                !item.name ||
                !purchaseDate ||
                !Number.isInteger(warrantyMonths) ||
                warrantyMonths < 0 ||
                warrantyMonths > 600
              ) {
                continue;
              }

              let receiptPath: string | null = null;
              if (item.receipt?.data) {
                const blob = base64ToBlob(
                  item.receipt.data,
                  item.receipt.type || "application/octet-stream"
                );
                if (blob.size > MAX_RECEIPT_SIZE || !ALLOWED_RECEIPT_TYPES.has(blob.type)) {
                  continue;
                }
                const safeName = String(item.receipt.name || "comprovante")
                  .normalize("NFKD")
                  .replace(/[^\w.-]+/g, "-")
                  .slice(-100);
                const uploaded = await api<{ path: string }>("receipt_upload", {
                  name: safeName,
                  type: blob.type,
                  data: await fileToBase64(blob),
                });
                receiptPath = uploaded.path;
                uploadedPaths.push(receiptPath);
              }

              const cat = normalizeCategory(item.category);
              const price =
                typeof item.price === "number" && Number.isFinite(item.price) ? item.price : null;
              const rawNotes = String(item.notes || "");
              const encodedNotes = rawNotes.startsWith("[[g:")
                ? rawNotes.slice(0, 500)
                : encodeProductNotes(rawNotes, cat, price);

              rows.push({
                user_id: user.id,
                name: String(item.name).slice(0, 100),
                store: String(item.store || "").slice(0, 100),
                model: String(item.model || "").slice(0, 100),
                purchase_date: purchaseDate,
                warranty_months: warrantyMonths,
                expiry_date: item.expiry_date || addMonths(purchaseDate, warrantyMonths),
                notes: encodedNotes,
                receipt_path: receiptPath,
              });
            }

            for (const row of rows) {
              await api("product_save", { product: row });
            }
            await onReloadProducts();
            onToast(`${rows.length} produto(s) importado(s) para sua conta.`);
          } catch (err) {
            for (const p of uploadedPaths) {
              await api("receipt_delete", { path: p }).catch(() => {});
            }
            onToast(friendlyError(err, "Não foi possível importar o backup."));
          } finally {
            setImporting(false);
          }
        },
      });
    } catch (err) {
      onToast(friendlyError(err, "Não foi possível ler o arquivo de backup."));
    }
  }

  function handleClearAllData() {
    if (!products.length) {
      onToast("Não há produtos para apagar.");
      return;
    }
    onRequestConfirm({
      title: "Apagar todos os produtos?",
      description:
        "Todos os produtos e comprovantes da sua conta serão removidos permanentemente. Esta ação não pode ser desfeita.",
      confirmLabel: "Apagar tudo",
      tone: "danger",
      onConfirm: async () => {
        try {
          for (const p of [...products]) {
            await api("product_delete", { id: p.id });
          }
          await onReloadProducts();
          onToast("Os produtos da sua conta foram apagados.");
        } catch (err) {
          onToast(friendlyError(err, "Não foi possível apagar os dados."));
        }
      },
    });
  }

  function handleDeleteAccount() {
    onRequestConfirm({
      title: "Excluir conta definitivamente?",
      description:
        "Todos os produtos, comprovantes e dados de acesso do Garantia serão apagados para sempre.",
      confirmLabel: "Excluir minha conta",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api("account_delete");
          onClose();
          onAccountDeleted();
        } catch (err) {
          onToast(friendlyError(err, "Não foi possível excluir a conta."));
        }
      },
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] flex flex-col overflow-hidden shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15 sm:hidden shrink-0" />

        <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Sua conta
            </p>
            <h2
              id="settings-modal-title"
              className="font-display text-lg font-bold text-neutral-900 dark:text-white"
            >
              Conta, backup e preferências
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-safe">
          {/* Account Form */}
          <form onSubmit={handleSaveAccount} className="space-y-3.5">
            <div>
              <label
                htmlFor="st-name"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Nome
              </label>
              <input
                id="st-name"
                type="text"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="st-email"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                E-mail
              </label>
              <input
                id="st-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="st-password"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Nova senha (opcional)
              </label>
              <input
                id="st-password"
                type="password"
                minLength={10}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para manter a atual"
                className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ao alterar o e-mail, enviaremos um link de confirmação para o novo endereço.
            </p>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full min-h-[44px] sm:min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </form>

          {/* Backup & App Tools */}
          <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08] space-y-2.5">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Backup e aplicativo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={exporting}
                className="min-h-[44px] px-3.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-sm font-medium text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{exporting ? "Exportando…" : "Exportar backup"}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="min-h-[44px] px-3.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-sm font-medium text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Upload className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>{importing ? "Importando…" : "Importar backup"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVersions();
                }}
                className="min-h-[44px] px-3.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-sm font-medium text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center gap-2"
              >
                <History className="h-4 w-4 text-neutral-500" />
                <span>Versão ({appVersion})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="min-h-[44px] px-3.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] hover:bg-neutral-100 dark:hover:bg-white/[0.06] text-sm font-medium text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center gap-2"
              >
                <LogOut className="h-4 w-4 text-neutral-500" />
                <span>Sair da conta</span>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-neutral-200 dark:border-white/[0.08] space-y-2.5">
            <h3 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
              Zona de risco
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleClearAllData}
                className="min-h-[44px] px-3.5 rounded-lg border border-red-500/25 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Apagar produtos</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="min-h-[44px] px-3.5 rounded-lg border border-red-500/25 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center justify-center gap-2"
              >
                <span>Excluir minha conta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
