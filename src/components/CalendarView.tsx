import React, { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { WarrantyProduct } from "../types";
import {
  daysCopy,
  formatCurrencyBRL,
  formatDate,
  localDateString,
  statusLabel,
} from "../lib/warranty";

interface CalendarViewProps {
  products: WarrantyProduct[];
  onViewDetails: (product: WarrantyProduct) => void;
  onOpenReceipt: (product: WarrantyProduct) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const CalendarView: React.FC<CalendarViewProps> = ({
  products,
  onViewDetails,
  onOpenReceipt,
}) => {
  const todayStr = localDateString();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const productsByDate = useMemo(() => {
    const map = new Map<string, WarrantyProduct[]>();
    for (const p of products) {
      const list = map.get(p.expiry_date) || [];
      list.push(p);
      map.set(p.expiry_date, list);
    }
    return map;
  }, [products]);

  const monthProducts = useMemo(() => {
    return products
      .filter((p) => p.expiry_date.startsWith(monthKey))
      .sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  }, [products, monthKey]);

  const monthTotalValue = useMemo(() => {
    return monthProducts.reduce((sum, p) => sum + (p.price || 0), 0);
  }, [monthProducts]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < firstDay; i += 1) {
      cells.push({ day: null, dateStr: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${monthKey}-${String(day).padStart(2, "0")}`;
      cells.push({ day, dateStr });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, dateStr: null });
    }
    return cells;
  }, [cursor.year, cursor.month, monthKey]);

  const monthLabel = new Date(cursor.year, cursor.month, 15).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(todayStr);
  }

  const displayedList =
    selectedDay && selectedDay.startsWith(monthKey)
      ? productsByDate.get(selectedDay) || []
      : monthProducts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Cronograma de vencimentos
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Calendário de garantias
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Mês anterior"
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.06] capitalize whitespace-nowrap"
          >
            {monthLabel}
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Próximo mês"
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.06]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Calendar Grid */}
        <section className="lg:col-span-7 rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] p-4 sm:p-5">
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-neutral-200 dark:border-white/[0.08] text-xs text-neutral-500 dark:text-neutral-400">
            <span>
              <strong className="font-mono-num text-neutral-900 dark:text-white">
                {monthProducts.length}
              </strong>{" "}
              {monthProducts.length === 1 ? "vencimento neste mês" : "vencimentos neste mês"}
            </span>
            {monthTotalValue > 0 && (
              <span className="font-mono-num">
                Total: <strong className="text-neutral-900 dark:text-white">{formatCurrencyBRL(monthTotalValue)}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, index) => {
              if (!cell.day || !cell.dateStr) {
                return <div key={`empty-${index}`} className="min-h-[46px] sm:min-h-[58px]" />;
              }
              const items = productsByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDay;

              const hasExpired = items.some((i) => i.status === "expired");
              const hasSoon = items.some((i) => i.status === "soon");

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() =>
                    setSelectedDay(isSelected ? null : cell.dateStr)
                  }
                  className={`min-h-[46px] sm:min-h-[58px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-colors ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10"
                      : isToday
                        ? "border-neutral-300 dark:border-white/25 bg-neutral-50 dark:bg-white/[0.04]"
                        : "border-transparent hover:bg-neutral-100/70 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span
                    className={`font-mono-num text-xs ${
                      isToday
                        ? "font-bold text-emerald-700 dark:text-emerald-400"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {cell.day}
                  </span>

                  {items.length > 0 && (
                    <span
                      className={`font-mono-num text-[10px] font-semibold px-1.5 py-0.5 rounded self-start ${
                        hasExpired
                          ? "bg-red-500/15 text-red-700 dark:text-red-300"
                          : hasSoon
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      }`}
                    >
                      {items.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Selected Day / Month List Panel */}
        <section className="lg:col-span-5 rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-200 dark:border-white/[0.08]">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {selectedDay
                  ? `Vencimentos em ${formatDate(selectedDay)}`
                  : "Todos os vencimentos do mês"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {displayedList.length}{" "}
                {displayedList.length === 1 ? "produto" : "produtos"}
              </p>
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
              >
                Ver mês inteiro
              </button>
            )}
          </div>

          {displayedList.length === 0 ? (
            <div className="py-10 text-center">
              <CalendarDays className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-600" />
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma garantia expira neste período.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 dark:divide-white/[0.06] mt-1">
              {displayedList.map((product) => {
                const statusColor =
                  product.status === "active"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : product.status === "soon"
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-red-700 dark:text-red-400";

                return (
                  <div
                    key={product.id}
                    onClick={() => onViewDetails(product)}
                    className="py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02] -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                        {[product.category, product.store, formatDate(product.expiry_date)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className={`text-xs font-medium mt-1 ${statusColor}`}>
                        {statusLabel(product.status)} · {daysCopy(product.daysRemaining)}
                      </p>
                    </div>
                    <div
                      className="flex flex-col items-end gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {product.price !== null && product.price > 0 && (
                        <span className="font-mono-num text-xs text-neutral-700 dark:text-neutral-300">
                          {formatCurrencyBRL(product.price)}
                        </span>
                      )}
                      {product.receipt_path && (
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(product)}
                          className="min-h-[32px] px-2 rounded text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 inline-flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Nota
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
