import React from "react";
import { Bell, CalendarDays, Layers, Moon, Plus, Settings, Sun } from "lucide-react";
import type { ActiveView, AppTheme } from "../types";
import { BrandMark } from "./BrandMark";

interface MobileNavProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onAddProduct: () => void;
  onOpenSettings: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  alertCount: number;
}

export const MobileTopBar: React.FC<
  Pick<MobileNavProps, "onSelectView" | "theme" | "onToggleTheme" | "onOpenSettings">
> = ({ onSelectView, theme, onToggleTheme, onOpenSettings }) => {
  return (
    <header className="lg:hidden sticky top-0 z-30 h-[52px] px-4 flex items-center justify-between border-b border-neutral-200 dark:border-white/[0.08] bg-[#F8F9FA]/90 dark:bg-[#0B0D10]/90 backdrop-blur-md">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onSelectView("inventory");
        }}
        className="inline-flex items-center gap-2 text-base font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap shrink-0"
      >
        <BrandMark className="h-7 w-7" />
        <span className="font-display">Garantia</span>
      </a>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-white/[0.06]"
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Configurações e conta"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-white/[0.06]"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </div>
    </header>
  );
};

export const MobileBottomBar: React.FC<
  Pick<MobileNavProps, "activeView" | "onSelectView" | "onAddProduct" | "onOpenSettings" | "alertCount">
> = ({ activeView, onSelectView, onAddProduct, onOpenSettings, alertCount }) => {
  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0E1116]/95 backdrop-blur-md pb-safe"
      aria-label="Navegação inferior"
    >
      <div className="grid grid-cols-5 items-center h-14 px-1">
        <button
          type="button"
          onClick={() => onSelectView("inventory")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg ${
            activeView === "inventory"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          <Layers className="h-5 w-5" />
          <span className="text-[10px] font-medium whitespace-nowrap">Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectView("calendar")}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg ${
            activeView === "calendar"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px] font-medium whitespace-nowrap">Calendário</span>
        </button>

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onAddProduct}
            aria-label="Adicionar produto"
            className="h-11 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onSelectView("alerts")}
          className={`relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg ${
            activeView === "alerts"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          <div className="relative">
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-amber-500 text-[9px] font-bold text-neutral-950 flex items-center justify-center font-mono-num">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium whitespace-nowrap">Alertas</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg text-neutral-500 dark:text-neutral-400"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px] font-medium whitespace-nowrap">Conta</span>
        </button>
      </div>
    </nav>
  );
};
