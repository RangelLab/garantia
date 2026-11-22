import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertsView } from "./components/AlertsView";
import { AuthMode, AuthScreen } from "./components/AuthScreen";
import { CalendarView } from "./components/CalendarView";
import { ConfirmModal } from "./components/ConfirmModal";
import { InventoryView } from "./components/InventoryView";
import { MobileBottomBar, MobileTopBar } from "./components/MobileNav";
import { ProductDetailDrawer } from "./components/ProductDetailDrawer";
import { ProductFormModal } from "./components/ProductFormModal";
import { ReceiptViewerModal } from "./components/ReceiptViewerModal";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { VersionModal } from "./components/VersionModal";
import {
  api,
  clearTokens,
  friendlyError,
  getRefreshToken,
  loadSavedSession,
  refreshSession,
  updateStoredUser,
} from "./lib/api";
import { enrichProduct } from "./lib/warranty";
import type {
  ActiveView,
  AppTheme,
  InventoryLayout,
  ProductCategory,
  RawProduct,
  SortOption,
  StatusFilter,
  User,
  VersionEntry,
  WarrantyProduct,
} from "./types";

function detectInitialAuthMode(): AuthMode {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("criar-conta")) return "signup";
  if (path.includes("redefinir-senha")) return "reset";
  if (path.includes("confirmar-email")) return "confirm-email";
  return "login";
}

export const App: React.FC = () => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem("garantia-theme");
      return saved === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [initialAuthMode] = useState<AuthMode>(() => detectInitialAuthMode());

  const [rawProducts, setRawProducts] = useState<RawProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>("inventory");
  const [layout, setLayout] = useState<InventoryLayout>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | ProductCategory>("all");
  const [receiptOnly, setReceiptOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("expiry_asc");
  const [noticeDismissed, setNoticeDismissed] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem("notice-dismissed"));
    } catch {
      return false;
    }
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WarrantyProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<WarrantyProduct | null>(null);
  const [receiptProduct, setReceiptProduct] = useState<WarrantyProduct | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const [versionHistory, setVersionHistory] = useState<VersionEntry[]>([]);
  const [appVersion, setAppVersion] = useState("v1.2.0");

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: "danger" | "default";
    busy: boolean;
    onConfirm: () => Promise<void> | void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirmar",
    tone: "danger",
    busy: false,
    onConfirm: () => {},
  });

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  }, []);

  // Apply theme to <html> and meta theme-color
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("garantia-theme", theme);
    } catch {
      // ignore
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0B0D10" : "#F8F9FA");
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api<{ products?: RawProduct[] }>("products_list");
      setRawProducts(res.products || []);
    } catch (err) {
      showToast(friendlyError(err, "Não foi possível carregar seus produtos."));
    } finally {
      setLoadingProducts(false);
    }
  }, [showToast]);

  // Load version history
  useEffect(() => {
    fetch("/version-history.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("unavailable");
        return res.json() as Promise<VersionEntry[]>;
      })
      .then((history) => {
        if (Array.isArray(history) && history.length > 0) {
          setVersionHistory(history);
          setAppVersion(`v${history[0].version}`);
        }
      })
      .catch(() => {
        // fallback already set
      });
  }, []);

  // Restore saved session on mount (unless explicitly visiting email confirmation/reset links)
  useEffect(() => {
    if (initialAuthMode === "confirm-email" || initialAuthMode === "reset") {
      setAuthChecking(false);
      return;
    }

    const saved = loadSavedSession();
    if (!saved) {
      setAuthChecking(false);
      return;
    }

    (async () => {
      try {
        let me: { user?: User } | null = null;
        try {
          me = await api<{ user?: User }>("me");
        } catch {
          if (await refreshSession()) {
            me = await api<{ user?: User }>("me");
          }
        }
        if (me?.user) {
          setUser(me.user);
          await loadProducts();
        } else {
          clearTokens();
          setUser(null);
        }
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    })();
  }, [initialAuthMode, loadProducts]);

  const products = useMemo(() => {
    return rawProducts.map(enrichProduct);
  }, [rawProducts]);

  const alertCount = useMemo(() => {
    return products.filter((p) => p.status === "soon").length;
  }, [products]);

  async function handleAuthenticated(loggedUser: User) {
    setAuthNotice(null);
    setUser(loggedUser);
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    await loadProducts();
  }

  async function handleSignOut() {
    const rt = getRefreshToken();
    try {
      await api("signout", { refresh_token: rt });
    } catch {
      // ignore signout network errors
    }
    clearTokens();
    setUser(null);
    setRawProducts([]);
    setDetailProduct(null);
    setReceiptProduct(null);
  }

  function handleOpenNewProduct() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function handleOpenEditProduct(product: WarrantyProduct) {
    setDetailProduct(null);
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleRequestDelete(product: WarrantyProduct) {
    setConfirmState({
      open: true,
      title: `Apagar “${product.name}”?`,
      description: product.receipt_path
        ? "O cadastro e o comprovante serão removidos da sua conta."
        : "Este produto será removido da sua conta.",
      confirmLabel: "Apagar produto",
      tone: "danger",
      busy: false,
      onConfirm: async () => {
        try {
          await api("product_delete", { id: product.id });
          setDetailProduct(null);
          await loadProducts();
          showToast("Produto removido da sua conta.");
        } catch (err) {
          showToast(friendlyError(err, "Não foi possível apagar o produto."));
        }
      },
    });
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0D10] flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        initialMode={initialAuthMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={(u) => void handleAuthenticated(u)}
        initialNotice={authNotice}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0B0D10] text-neutral-900 dark:text-neutral-100 flex flex-col lg:flex-row">
      <Sidebar
        user={user}
        activeView={activeView}
        onSelectView={setActiveView}
        onAddProduct={handleOpenNewProduct}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenVersions={() => setVersionsOpen(true)}
        onSignOut={() => void handleSignOut()}
        theme={theme}
        onToggleTheme={toggleTheme}
        totalCount={products.length}
        alertCount={alertCount}
        appVersion={appVersion}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTopBar
          onSelectView={setActiveView}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:py-8">
          {activeView === "inventory" && (
            <InventoryView
              products={products}
              loading={loadingProducts}
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              receiptOnly={receiptOnly}
              onReceiptOnlyChange={setReceiptOnly}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              layout={layout}
              onLayoutChange={setLayout}
              noticeDismissed={noticeDismissed}
              onDismissNotice={() => {
                try {
                  sessionStorage.setItem("notice-dismissed", "1");
                } catch {
                  // ignore
                }
                setNoticeDismissed(true);
              }}
              onGoToAlerts={() => setActiveView("alerts")}
              onAddProduct={handleOpenNewProduct}
              onViewDetails={(p) => setDetailProduct(p)}
              onEditProduct={handleOpenEditProduct}
              onOpenReceipt={(p) => setReceiptProduct(p)}
            />
          )}

          {activeView === "calendar" && (
            <CalendarView
              products={products}
              onViewDetails={(p) => setDetailProduct(p)}
              onOpenReceipt={(p) => setReceiptProduct(p)}
            />
          )}

          {activeView === "alerts" && (
            <AlertsView
              products={products}
              onViewDetails={(p) => setDetailProduct(p)}
              onEditProduct={handleOpenEditProduct}
              onOpenReceipt={(p) => setReceiptProduct(p)}
            />
          )}
        </main>
      </div>

      <MobileBottomBar
        activeView={activeView}
        onSelectView={setActiveView}
        onAddProduct={handleOpenNewProduct}
        onOpenSettings={() => setSettingsOpen(true)}
        alertCount={alertCount}
      />

      {/* Modals & Drawers */}
      <ProductFormModal
        open={formOpen}
        userId={user.id}
        product={editingProduct}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        onSaved={async (msg) => {
          await loadProducts();
          showToast(msg);
        }}
        onWarnToast={showToast}
      />

      <ProductDetailDrawer
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onEdit={handleOpenEditProduct}
        onDelete={handleRequestDelete}
        onOpenReceipt={(p) => setReceiptProduct(p)}
      />

      <ReceiptViewerModal
        product={receiptProduct}
        onClose={() => setReceiptProduct(null)}
      />

      <SettingsModal
        open={settingsOpen}
        user={user}
        products={products}
        appVersion={appVersion}
        onClose={() => setSettingsOpen(false)}
        onUserUpdated={(updated) => {
          setUser(updated);
          updateStoredUser(updated);
        }}
        onPasswordChanged={() => {
          clearTokens();
          setUser(null);
          setRawProducts([]);
          setAuthNotice("Senha atualizada. Entre novamente com sua nova senha.");
        }}
        onAccountDeleted={() => {
          clearTokens();
          setUser(null);
          setRawProducts([]);
          setAuthNotice("Sua conta do Garantia foi excluída.");
        }}
        onSignOut={() => void handleSignOut()}
        onOpenVersions={() => setVersionsOpen(true)}
        onReloadProducts={loadProducts}
        onToast={showToast}
        onRequestConfirm={(opts) =>
          setConfirmState({
            open: true,
            title: opts.title,
            description: opts.description,
            confirmLabel: opts.confirmLabel,
            tone: opts.tone || "danger",
            busy: false,
            onConfirm: opts.onConfirm,
          })
        }
      />

      <VersionModal
        open={versionsOpen}
        appVersion={appVersion}
        history={versionHistory}
        onClose={() => setVersionsOpen(false)}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        tone={confirmState.tone}
        busy={confirmState.busy}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={async () => {
          setConfirmState((s) => ({ ...s, busy: true }));
          try {
            await confirmState.onConfirm();
          } finally {
            setConfirmState((s) => ({ ...s, open: false, busy: false }));
          }
        }}
      />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] rounded-xl border border-neutral-200 dark:border-white/15 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 text-xs font-semibold shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
};
export default App;
