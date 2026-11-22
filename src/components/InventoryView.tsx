import React, { useMemo } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  InventoryLayout,
  ProductCategory,
  SortOption,
  StatusFilter,
  WarrantyProduct,
} from "../types";
import {
  PRODUCT_CATEGORIES,
  daysCopy,
  formatCurrencyBRL,
  formatDate,
  statusLabel,
} from "../lib/warranty";

interface InventoryViewProps {
  products: WarrantyProduct[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (val: StatusFilter) => void;
  categoryFilter: "all" | ProductCategory;
  onCategoryFilterChange: (val: "all" | ProductCategory) => void;
  receiptOnly: boolean;
  onReceiptOnlyChange: (val: boolean) => void;
  sortBy: SortOption;
  onSortByChange: (val: SortOption) => void;
  layout: InventoryLayout;
  onLayoutChange: (val: InventoryLayout) => void;
  noticeDismissed: boolean;
  onDismissNotice: () => void;
  onGoToAlerts: () => void;
  onAddProduct: () => void;
  onViewDetails: (product: WarrantyProduct) => void;
  onEditProduct: (product: WarrantyProduct) => void;
  onOpenReceipt: (product: WarrantyProduct) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  receiptOnly,
  onReceiptOnlyChange,
  sortBy,
  onSortByChange,
  layout,
  onLayoutChange,
  noticeDismissed,
  onDismissNotice,
  onGoToAlerts,
  onAddProduct,
  onViewDetails,
  onEditProduct,
  onOpenReceipt,
}) => {
  const stats = useMemo(() => {
    let active = 0;
    let soon = 0;
    let expired = 0;
    let coveredValue = 0;
    let pricedActiveCount = 0;

    for (const p of products) {
      if (p.status === "active") active += 1;
      else if (p.status === "soon") soon += 1;
      else expired += 1;

      if (p.status !== "expired" && p.price !== null && p.price > 0) {
        coveredValue += p.price;
        pricedActiveCount += 1;
      }
    }
    return { active, soon, expired, coveredValue, pricedActiveCount };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    const list = products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (receiptOnly && !p.receipt_path) return false;
      if (q) {
        const hay = `${p.name} ${p.store || ""} ${p.model || ""} ${p.category} ${p.plainNotes}`.toLocaleLowerCase("pt-BR");
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === "price_desc") {
        const pa = a.price ?? -1;
        const pb = b.price ?? -1;
        if (pb !== pa) return pb - pa;
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      if (sortBy === "purchase_desc") {
        return b.purchase_date.localeCompare(a.purchase_date);
      }
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      const aExp = a.status === "expired";
      const bExp = b.status === "expired";
      if (aExp !== bExp) return aExp ? 1 : -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });
  }, [products, search, statusFilter, categoryFilter, receiptOnly, sortBy]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    receiptOnly;

  function clearFilters() {
    onSearchChange("");
    onStatusFilterChange("all");
    onCategoryFilterChange("all");
    onReceiptOnlyChange(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            BoRan Studio · Organização da casa
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white [text-wrap:balance]">
            Inventário de garantias
          </h1>
        </div>
        <button
          type="button"
          onClick={onAddProduct}
          className="hidden lg:inline-flex min-h-[40px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold items-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar produto</span>
        </button>
      </div>

      {/* 4-Column KPI Strip */}
      <section aria-label="Resumo das garantias" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onStatusFilterChange(statusFilter === "active" ? "all" : "active")}
          className={`text-left rounded-xl border p-4 transition-colors ${
            statusFilter === "active"
              ? "border-emerald-500/50 bg-emerald-500/[0.06] dark:bg-emerald-500/10"
              : "border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] hover:border-neutral-300 dark:hover:border-white/15"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Ativas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-mono-num text-2xl font-semibold text-neutral-900 dark:text-white">
            {stats.active}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Em dia</p>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange(statusFilter === "soon" ? "all" : "soon")}
          className={`text-left rounded-xl border p-4 transition-colors ${
            statusFilter === "soon"
              ? "border-amber-500/50 bg-amber-500/[0.07] dark:bg-amber-500/10"
              : "border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] hover:border-neutral-300 dark:hover:border-white/15"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Vencem em breve</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-mono-num text-2xl font-semibold text-neutral-900 dark:text-white">
            {stats.soon}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Próximos 30 dias</p>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange(statusFilter === "expired" ? "all" : "expired")}
          className={`text-left rounded-xl border p-4 transition-colors ${
            statusFilter === "expired"
              ? "border-red-500/50 bg-red-500/[0.06] dark:bg-red-500/10"
              : "border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] hover:border-neutral-300 dark:hover:border-white/15"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Vencidas</span>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 font-mono-num text-2xl font-semibold text-neutral-900 dark:text-white">
            {stats.expired}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">Histórico</p>
        </button>

        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] p-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Valor protegido</span>
          </div>
          <p className="mt-2 font-mono-num text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-white truncate">
            {stats.coveredValue > 0 ? formatCurrencyBRL(stats.coveredValue) : "R$ 0,00"}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {stats.pricedActiveCount}{" "}
            {stats.pricedActiveCount === 1 ? "item com valor" : "itens com valor"}
          </p>
        </div>
      </section>

      {/* Alert Banner */}
      {stats.soon > 0 && !noticeDismissed && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] dark:bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <Clock className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0 text-sm">
              <span className="font-semibold text-neutral-900 dark:text-amber-200">
                {stats.soon === 1
                  ? "1 garantia vence nos próximos 30 dias"
                  : `${stats.soon} garantias vencem nos próximos 30 dias`}
              </span>
              <span className="hidden sm:inline text-neutral-600 dark:text-amber-200/80">
                {" "}
                — revise os prazos e notas fiscais antes do encerramento.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onGoToAlerts}
              className="min-h-[36px] px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              Ver alertas
            </button>
            <button
              type="button"
              onClick={onDismissNotice}
              aria-label="Fechar aviso"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search, Segmented Status Filter, Category & Sort Toolbar */}
      <section className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <label className="relative flex-1 block">
            <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por produto, loja, modelo ou categoria…"
              aria-label="Buscar produtos"
              className="w-full min-h-[44px] sm:min-h-[38px] pl-10 pr-3.5 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-base sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value as "all" | ProductCategory)}
              className="min-h-[44px] sm:min-h-[38px] px-3 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-sm text-neutral-700 dark:text-neutral-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="all">Todas categorias</option>
              {PRODUCT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Ordenar produtos"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortOption)}
              className="min-h-[44px] sm:min-h-[38px] px-3 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-sm text-neutral-700 dark:text-neutral-200 focus:border-emerald-500 focus:outline-none"
            >
              <option value="expiry_asc">Vencimento próximo</option>
              <option value="price_desc">Maior valor</option>
              <option value="purchase_desc">Compra recente</option>
              <option value="name_asc">Nome (A–Z)</option>
            </select>

            <button
              type="button"
              onClick={() => onReceiptOnlyChange(!receiptOnly)}
              className={`min-h-[44px] sm:min-h-[38px] px-3 rounded-lg border text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap ${
                receiptOnly
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.04]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Com nota</span>
            </button>

            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A]">
              <button
                type="button"
                onClick={() => onLayoutChange("list")}
                aria-label="Visualização em lista"
                className={`h-8 w-8 rounded-md flex items-center justify-center ${
                  layout === "list"
                    ? "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                    : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onLayoutChange("grid")}
                aria-label="Visualização em grade"
                className={`h-8 w-8 rounded-md flex items-center justify-center ${
                  layout === "grid"
                    ? "bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white"
                    : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Segmented Tabs */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-neutral-200/70 dark:bg-white/[0.05]">
            {(
              [
                { id: "all", label: "Todos", count: products.length },
                { id: "active", label: "Ativas", count: stats.active },
                { id: "soon", label: "Em breve", count: stats.soon },
                { id: "expired", label: "Vencidas", count: stats.expired },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`min-h-[34px] px-3 rounded-md text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                    active
                      ? "bg-white dark:bg-[#181C22] text-neutral-900 dark:text-white shadow-xs"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono-num text-[11px] text-neutral-400 dark:text-neutral-500">
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0 inline-flex items-center gap-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] divide-y divide-neutral-200 dark:divide-white/[0.06]">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 rounded bg-neutral-200 dark:bg-white/10" />
                <div className="h-3 w-72 rounded bg-neutral-100 dark:bg-white/[0.06]" />
              </div>
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-white/10" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <section className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-neutral-900 dark:text-white">
            {products.length === 0
              ? "Seu inventário está pronto"
              : "Nenhum produto encontrado"}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
            {products.length === 0
              ? "Cadastre seu primeiro produto em poucos cliques para guardar o comprovante e acompanhar o prazo."
              : "Nenhum item corresponde à busca ou aos filtros selecionados."}
          </p>
          <div className="mt-6">
            {products.length === 0 ? (
              <button
                type="button"
                onClick={onAddProduct}
                className="min-h-[44px] px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar primeiro produto
              </button>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-[44px] px-5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.04] text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.08]"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Desktop List View */}
          {layout === "list" && (
            <div className="hidden md:block rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-4 py-2.5 border-b border-neutral-200 dark:border-white/[0.08] text-xs font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-50/70 dark:bg-white/[0.02]">
                <div className="col-span-4">Produto</div>
                <div className="col-span-3">Vigência</div>
                <div className="col-span-2 text-right">Valor</div>
                <div className="col-span-2">Situação</div>
                <div className="col-span-1 text-right">Ações</div>
              </div>

              <div className="divide-y divide-neutral-200 dark:divide-white/[0.06]">
                {filteredProducts.map((product) => {
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
                      key={product.id}
                      onClick={() => onViewDetails(product)}
                      className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center hover:bg-neutral-50 dark:hover:bg-white/[0.025] cursor-pointer"
                    >
                      <div className="col-span-4 min-w-0">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {[product.category, product.model, product.store]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>

                      <div className="col-span-3 min-w-0">
                        <div className="flex items-center justify-between text-xs font-mono-num text-neutral-600 dark:text-neutral-300">
                          <span>{formatDate(product.purchase_date)}</span>
                          <span className="text-neutral-400 dark:text-neutral-500">→</span>
                          <span>{formatDate(product.expiry_date)}</span>
                        </div>
                        <div className="mt-1.5 h-1 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${product.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="col-span-2 text-right font-mono-num text-sm text-neutral-800 dark:text-neutral-200">
                        {formatCurrencyBRL(product.price)}
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className={`text-xs font-medium ${statusColor}`}>
                          {statusLabel(product.status)}
                        </p>
                        <p className="mt-0.5 font-mono-num text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {daysCopy(product.daysRemaining)}
                        </p>
                      </div>

                      <div
                        className="col-span-1 flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {product.receipt_path && (
                          <button
                            type="button"
                            onClick={() => onOpenReceipt(product)}
                            title="Ver comprovante"
                            aria-label={`Ver comprovante de ${product.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditProduct(product)}
                          title="Editar"
                          aria-label={`Editar ${product.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid View (Desktop when toggled OR always on mobile < md) */}
          <div
            className={`${
              layout === "grid" ? "grid" : "grid md:hidden"
            } grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3`}
          >
            {filteredProducts.map((product) => {
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
                <article
                  key={product.id}
                  onClick={() => onViewDetails(product)}
                  className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#12151A] p-4 flex flex-col justify-between gap-3.5 hover:border-neutral-300 dark:hover:border-white/20 cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {product.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {[product.category, product.model, product.store]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {product.price !== null && product.price > 0 && (
                        <span className="font-mono-num text-xs font-medium text-neutral-700 dark:text-neutral-300 shrink-0">
                          {formatCurrencyBRL(product.price)}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${statusColor}`}>
                          {statusLabel(product.status)}
                        </span>
                        <span className="font-mono-num text-neutral-600 dark:text-neutral-300">
                          {daysCopy(product.daysRemaining)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${product.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono-num text-neutral-500 dark:text-neutral-400 pt-0.5">
                        <span>{formatDate(product.purchase_date)}</span>
                        <span>Vence {formatDate(product.expiry_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="pt-3 border-t border-neutral-200 dark:border-white/[0.06] flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {product.receipt_path ? (
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(product)}
                        className="min-h-[44px] sm:min-h-[34px] px-2.5 -ml-2.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ver comprovante
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">
                        Sem comprovante
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onViewDetails(product)}
                      className="min-h-[44px] sm:min-h-[34px] px-2.5 -mr-2.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06] whitespace-nowrap"
                    >
                      Detalhes →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
