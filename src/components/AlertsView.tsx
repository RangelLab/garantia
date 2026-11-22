import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, FileText, Pencil } from "lucide-react";
import type { WarrantyProduct } from "../types";
import {
  CRITICAL_DAYS,
  daysCopy,
  formatCurrencyBRL,
  formatDate,
} from "../lib/warranty";

interface AlertsViewProps {
  products: WarrantyProduct[];
  onViewDetails: (product: WarrantyProduct) => void;
  onEditProduct: (product: WarrantyProduct) => void;
  onOpenReceipt: (product: WarrantyProduct) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  products,
  onViewDetails,
  onEditProduct,
  onOpenReceipt,
}) => {
  const [showAllExpired, setShowAllExpired] = useState(false);

  const groups = useMemo(() => {
    const critical: WarrantyProduct[] = [];
    const warning: WarrantyProduct[] = [];
    const recentExpired: WarrantyProduct[] = [];
    const olderExpired: WarrantyProduct[] = [];

    const sorted = [...products].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));

    for (const p of sorted) {
      if (p.daysRemaining >= 0 && p.daysRemaining <= CRITICAL_DAYS) {
        critical.push(p);
      } else if (p.status === "soon") {
        warning.push(p);
      } else if (p.status === "expired") {
        if (p.daysRemaining >= -60) recentExpired.push(p);
        else olderExpired.push(p);
      }
    }

    recentExpired.reverse();
    olderExpired.reverse();

    return { critical, warning, recentExpired, olderExpired };
  }, [products]);

  const renderRow = (product: WarrantyProduct, tone: "critical" | "warning" | "expired") => {
    const toneClass =
      tone === "critical"
        ? "text-red-700 dark:text-red-400"
        : tone === "warning"
          ? "text-amber-700 dark:text-amber-400"
          : "text-neutral-500 dark:text-neutral-400";

    return (
      <div
        key={product.id}
        onClick={() => onViewDetails(product)}
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-white/[0.025] cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {product.name}
            </h3>
            {product.price !== null && product.price > 0 && (
              <span className="font-mono-num text-xs text-neutral-500 dark:text-neutral-400 shrink-0">
                {formatCurrencyBRL(product.price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {[product.category, product.store, `Vence ${formatDate(product.expiry_date)}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div
          className="flex items-center justify-between sm:justify-end gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className={`font-mono-num text-xs font-semibold ${toneClass}`}>
            {daysCopy(product.daysRemaining)}
          </span>
          <div className="flex items-center gap-1">
            {product.receipt_path && (
              <button
                type="button"
                onClick={() => onOpenReceipt(product)}
                className="min-h-[38px] px-2.5 rounded-lg border border-neutral-200 dark:border-white/10 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 inline-flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Comprovante</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onEditProduct(product)}
              aria-label={`Editar ${product.name}`}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const hasUrgent = groups.critical.length > 0 || groups.warning.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Monitoramento de prazos
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Central de alertas
        </h1>
      </div>

      {!hasUrgent && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h2 className="mt-3 font-display text-base font-semibold text-neutral-900 dark:text-white">
            Nenhuma garantia perto do vencimento
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Todos os seus produtos ativos têm mais de 30 dias de cobertura restante.
          </p>
        </div>
      )}

      {groups.critical.length > 0 && (
        <section className="rounded-xl border border-red-500/30 bg-white dark:bg-[#12151A] overflow-hidden">
          <div className="px-4 py-3 border-b border-red-500/20 bg-red-500/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Crítico — vence em até 7 dias</span>
            </div>
            <span className="font-mono-num text-xs font-semibold text-red-700 dark:text-red-300">
              {groups.critical.length}
            </span>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
            {groups.critical.map((p) => renderRow(p, "critical"))}
          </div>
        </section>
      )}

      {groups.warning.length > 0 && (
        <section className="rounded-xl border border-amber-500/30 bg-white dark:bg-[#12151A] overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/20 bg-amber-500/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <Clock className="h-4 w-4" />
              <span>Atenção — vence entre 8 e 30 dias</span>
            </div>
            <span className="font-mono-num text-xs font-semibold text-amber-800 dark:text-amber-300">
              {groups.warning.length}
            </span>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
            {groups.warning.map((p) => renderRow(p, "warning"))}
          </div>
        </section>
      )}

      {(groups.recentExpired.length > 0 || groups.olderExpired.length > 0) && (
        <section className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Garantias vencidas
            </span>
            <span className="font-mono-num text-xs text-neutral-500 dark:text-neutral-400">
              {groups.recentExpired.length + groups.olderExpired.length}
            </span>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
            {groups.recentExpired.map((p) => renderRow(p, "expired"))}
            {showAllExpired &&
              groups.olderExpired.map((p) => renderRow(p, "expired"))}
          </div>
          {groups.olderExpired.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllExpired((v) => !v)}
              className="w-full min-h-[44px] border-t border-neutral-200 dark:border-white/[0.08] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/[0.03] inline-flex items-center justify-center gap-1.5"
            >
              <span>
                {showAllExpired
                  ? "Ocultar vencidas antigas"
                  : `Mostrar mais ${groups.olderExpired.length} vencidas antigas`}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showAllExpired ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </section>
      )}
    </div>
  );
};
