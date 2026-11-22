import React from "react";
import { FileText, Pencil, Trash2, X } from "lucide-react";
import {
  daysCopy,
  formatCurrencyBRL,
  formatDate,
  statusLabel,
} from "../lib/warranty";
import type { WarrantyProduct } from "../types";

interface ProductDetailDrawerProps {
  product: WarrantyProduct | null;
  onClose: () => void;
  onEdit: (product: WarrantyProduct) => void;
  onDelete: (product: WarrantyProduct) => void;
  onOpenReceipt: (product: WarrantyProduct) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  product,
  onClose,
  onEdit,
  onDelete,
  onOpenReceipt,
}) => {
  if (!product) return null;

  const statusColor =
    product.status === "active"
      ? "text-emerald-700 dark:text-emerald-400"
      : product.status === "soon"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  const barColor =
    product.status === "active"
      ? "bg-emerald-500"
      : product.status === "soon"
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-md max-h-[90vh] sm:max-h-none sm:h-full rounded-t-2xl sm:rounded-none sm:border-l border-t sm:border-t-0 border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] flex flex-col overflow-hidden shadow-2xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15 sm:hidden shrink-0" />

        <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/[0.08] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {product.category}
            </p>
            <h2
              id="detail-drawer-title"
              className="mt-0.5 font-display text-xl font-bold text-neutral-900 dark:text-white break-words"
            >
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Coverage Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-semibold ${statusColor}`}>
                {statusLabel(product.status)}
              </span>
              <span className="font-mono-num text-xs text-neutral-600 dark:text-neutral-300">
                {daysCopy(product.daysRemaining)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${product.progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono-num text-neutral-500 dark:text-neutral-400">
              <span>Compra: {formatDate(product.purchase_date)}</span>
              <span>Fim: {formatDate(product.expiry_date)}</span>
            </div>
          </div>

          {/* Metadata Table */}
          <dl className="divide-y divide-neutral-200 dark:divide-white/[0.06] border-y border-neutral-200 dark:border-white/[0.08]">
            <div className="py-3 flex items-center justify-between gap-4 text-sm">
              <dt className="text-neutral-500 dark:text-neutral-400">Valor pago</dt>
              <dd className="font-mono-num font-medium text-neutral-900 dark:text-neutral-100">
                {formatCurrencyBRL(product.price)}
              </dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4 text-sm">
              <dt className="text-neutral-500 dark:text-neutral-400">Marca / modelo</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100 text-right">
                {product.model || "Não informada"}
              </dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4 text-sm">
              <dt className="text-neutral-500 dark:text-neutral-400">Loja</dt>
              <dd className="font-medium text-neutral-900 dark:text-neutral-100 text-right">
                {product.store || "Não informada"}
              </dd>
            </div>
            <div className="py-3 flex items-center justify-between gap-4 text-sm">
              <dt className="text-neutral-500 dark:text-neutral-400">Prazo total</dt>
              <dd className="font-mono-num font-medium text-neutral-900 dark:text-neutral-100">
                {product.warranty_months}{" "}
                {Number(product.warranty_months) === 1 ? "mês" : "meses"}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              Anotações
            </h3>
            <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
              {product.plainNotes || "Nenhuma anotação registrada."}
            </p>
          </div>

          {product.receipt_path && (
            <button
              type="button"
              onClick={() => onOpenReceipt(product)}
              className="w-full min-h-[44px] px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Visualizar comprovante anexado
            </button>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-3 pb-safe shrink-0">
          <button
            type="button"
            onClick={() => onDelete(product)}
            className="min-h-[44px] sm:min-h-[38px] px-3.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>Apagar</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(product)}
            className="min-h-[44px] sm:min-h-[38px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Pencil className="h-4 w-4" />
            <span>Editar produto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
