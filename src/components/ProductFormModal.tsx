import React, { useEffect, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { api, fileToBase64, friendlyError } from "../lib/api";
import {
  ALLOWED_RECEIPT_TYPES,
  MAX_RECEIPT_SIZE,
  PRODUCT_CATEGORIES,
  QUICK_WARRANTY_PRESETS,
  addMonths,
  encodeProductNotes,
  formatDateShort,
  localDateString,
  maxNotesLengthForMeta,
  parseCurrencyInput,
  receiptDisplayName,
} from "../lib/warranty";
import type { ProductCategory, WarrantyProduct } from "../types";

interface ProductFormModalProps {
  open: boolean;
  userId: string;
  product: WarrantyProduct | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void> | void;
  onWarnToast: (message: string) => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  userId,
  product,
  onClose,
  onSaved,
  onWarnToast,
}) => {
  const [name, setName] = useState("");
  const [store, setStore] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Eletrônicos");
  const [priceText, setPriceText] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(localDateString());
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [notes, setNotes] = useState("");
  const [retainedReceipt, setRetainedReceipt] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedFile(null);
    setDragActive(false);

    if (product) {
      setName(product.name || "");
      setStore(product.store || "");
      setModel(product.model || "");
      setCategory(product.category || "Outros");
      setPriceText(
        product.price !== null && product.price > 0
          ? product.price.toFixed(2).replace(".", ",")
          : ""
      );
      setPurchaseDate(product.purchase_date || localDateString());
      setWarrantyMonths(Number(product.warranty_months ?? 12));
      setNotes(product.plainNotes || "");
      setRetainedReceipt(product.receipt_path || null);
    } else {
      setName("");
      setStore("");
      setModel("");
      setCategory("Eletrônicos");
      setPriceText("");
      setPurchaseDate(localDateString());
      setWarrantyMonths(12);
      setNotes("");
      setRetainedReceipt(null);
    }
  }, [open, product]);

  if (!open) return null;

  const parsedPrice = parseCurrencyInput(priceText);
  const notesLimit = maxNotesLengthForMeta(category, parsedPrice);
  const computedExpiry =
    purchaseDate && Number.isInteger(warrantyMonths) && warrantyMonths >= 0
      ? addMonths(purchaseDate, warrantyMonths)
      : "";

  function handleFilePick(file: File | undefined | null) {
    if (!file) return;
    if (file.size > MAX_RECEIPT_SIZE) {
      setError("O comprovante deve ter até 10 MB.");
      return;
    }
    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
      setError("Anexe uma imagem JPG, PNG, WebP, GIF, HEIC ou um PDF.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Informe o nome do produto.");
      return;
    }
    if (!purchaseDate || purchaseDate > localDateString()) {
      setError("A data da compra não pode estar no futuro.");
      return;
    }
    if (!Number.isInteger(warrantyMonths) || warrantyMonths < 0 || warrantyMonths > 600) {
      setError("Informe um prazo de 0 a 600 meses.");
      return;
    }
    if (selectedFile) {
      if (selectedFile.size > MAX_RECEIPT_SIZE) {
        setError("O comprovante deve ter até 10 MB.");
        return;
      }
      if (!ALLOWED_RECEIPT_TYPES.has(selectedFile.type)) {
        setError("Anexe uma imagem JPG, PNG, WebP, GIF, HEIC ou um PDF.");
        return;
      }
    }

    const oldPath = product?.receipt_path || null;
    let receiptPath = retainedReceipt;
    let uploadedPath: string | null = null;

    setSaving(true);
    try {
      if (selectedFile) {
        const uploaded = await api<{ path: string }>("receipt_upload", {
          name: selectedFile.name,
          type: selectedFile.type,
          data: await fileToBase64(selectedFile),
        });
        uploadedPath = uploaded.path;
        receiptPath = uploaded.path;
      }

      const encodedNotes = encodeProductNotes(notes, category, parsedPrice);
      const payload: Record<string, unknown> = {
        user_id: userId,
        name: trimmedName,
        store: store.trim(),
        model: model.trim(),
        purchase_date: purchaseDate,
        warranty_months: warrantyMonths,
        expiry_date: addMonths(purchaseDate, warrantyMonths),
        notes: encodedNotes,
        receipt_path: receiptPath,
        updated_at: new Date().toISOString(),
      };
      if (product?.id) {
        payload.id = product.id;
      }

      await api("product_save", { product: payload });

      if (oldPath && oldPath !== receiptPath) {
        await api("receipt_delete", { path: oldPath }).catch(() => {
          onWarnToast("Produto salvo; o comprovante antigo não pôde ser removido.");
        });
      }

      await onSaved(
        product ? "Produto atualizado na sua conta." : "Produto salvo na sua conta."
      );
      onClose();
    } catch (err) {
      if (uploadedPath) {
        await api("receipt_delete", { path: uploadedPath }).catch(() => {});
      }
      setError(
        friendlyError(err, "Não foi possível salvar. Confira sua conexão e tente de novo.")
      );
    } finally {
      setSaving(false);
    }
  }

  const attachmentName = selectedFile
    ? selectedFile.name
    : retainedReceipt
      ? receiptDisplayName(retainedReceipt)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full sm:max-w-xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] flex flex-col overflow-hidden shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15 sm:hidden shrink-0" />

        <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              {product ? "Editar cadastro" : "Cadastro rápido"}
            </p>
            <h2
              id="product-form-title"
              className="font-display text-lg font-bold text-neutral-900 dark:text-white"
            >
              {product ? "Editar produto" : "Adicionar produto"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label
              htmlFor="pf-name"
              className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
            >
              Nome do produto <span className="text-red-500">*</span>
            </label>
            <input
              id="pf-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Notebook, Geladeira, Fone de ouvido"
              className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quick Category Selection */}
          <div>
            <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Categoria
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[36px] px-3 rounded-lg border text-xs font-medium whitespace-nowrap ${
                      active
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="pf-store"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Loja
              </label>
              <input
                id="pf-store"
                type="text"
                maxLength={100}
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Ex.: Amazon, Kabum"
                className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pf-model"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Marca / modelo
              </label>
              <input
                id="pf-model"
                type="text"
                maxLength={100}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Opcional"
                className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pf-price"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Valor pago (R$)
              </label>
              <input
                id="pf-price"
                type="text"
                inputMode="decimal"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                placeholder="0,00"
                className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 font-mono-num text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="pf-date"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Data da compra <span className="text-red-500">*</span>
              </label>
              <input
                id="pf-date"
                type="date"
                required
                max={localDateString()}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 font-mono-num text-base sm:text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="pf-months"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
              >
                Prazo (meses) <span className="text-red-500">*</span>
              </label>
              <input
                id="pf-months"
                type="number"
                min={0}
                max={600}
                required
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(Number(e.target.value))}
                className="w-full min-h-[44px] sm:min-h-[40px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 font-mono-num text-base sm:text-sm text-neutral-900 dark:text-neutral-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 1-Click Warranty Duration Presets + Live Expiry Preview */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_WARRANTY_PRESETS.map((preset) => {
                const active = warrantyMonths === preset.months;
                return (
                  <button
                    key={preset.months}
                    type="button"
                    onClick={() => setWarrantyMonths(preset.months)}
                    className={`min-h-[34px] px-3 rounded-lg border text-xs font-medium whitespace-nowrap ${
                      active
                        ? "border-emerald-500 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
                        : "border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
              {computedExpiry && (
                <span className="ml-auto font-mono-num text-xs text-neutral-500 dark:text-neutral-400">
                  Vence em {formatDateShort(computedExpiry)}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="pf-notes"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                Anotações
              </label>
              <span className="font-mono-num text-[11px] text-neutral-400 dark:text-neutral-500">
                {notes.length}/{notesLimit}
              </span>
            </div>
            <textarea
              id="pf-notes"
              rows={2}
              maxLength={notesLimit}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Número de série, garantia estendida, observações…"
              className="w-full rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#0B0D10] px-3 py-2.5 text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none resize-y"
            />
          </div>

          {/* Drag & Drop Receipt Upload */}
          <div>
            <span className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Comprovante / Nota fiscal
            </span>
            <label
              htmlFor="pf-receipt"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFilePick(e.dataTransfer.files?.[0]);
              }}
              className={`flex items-center gap-3.5 rounded-xl border border-dashed p-3.5 cursor-pointer transition-colors ${
                dragActive
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-neutral-300 dark:border-white/15 bg-neutral-50/70 dark:bg-white/[0.02] hover:bg-neutral-100/70 dark:hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {attachmentName ? <FileText className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {attachmentName || "Anexar imagem ou PDF da nota"}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  JPG, PNG, WebP, HEIC ou PDF · até 10 MB
                </p>
              </div>
              <input
                id="pf-receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,application/pdf"
                className="sr-only"
                onChange={(e) => handleFilePick(e.target.files?.[0])}
              />
            </label>

            {attachmentName && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setRetainedReceipt(null);
                }}
                className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                Remover comprovante anexado
              </button>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {/* Sticky Footer Actions inside Form */}
          <div className="pt-2 pb-safe flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] sm:min-h-[40px] px-4 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] sm:min-h-[40px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? "Salvando…" : product ? "Salvar alterações" : "Salvar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
