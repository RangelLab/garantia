import React from "react";
import {
  Bell,
  CalendarDays,
  History,
  Layers,
  LogOut,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import type { ActiveView, AppTheme, User } from "../types";
import { BrandMark } from "./BrandMark";

interface SidebarProps {
  user: User;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onAddProduct: () => void;
  onOpenSettings: () => void;
  onOpenVersions: () => void;
  onSignOut: () => void;
  theme: AppTheme;
  onToggleTheme: () => void;
  totalCount: number;
  alertCount: number;
  appVersion: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeView,
  onSelectView,
  onAddProduct,
  onOpenSettings,
  onOpenVersions,
  onSignOut,
  theme,
  onToggleTheme,
  totalCount,
  alertCount,
  appVersion,
}) => {
  const navItems: Array<{
    id: ActiveView;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      id: "inventory",
      label: "Inventário",
      icon: <Layers className="h-4 w-4" />,
      count: totalCount,
    },
    {
      id: "calendar",
      label: "Calendário",
      icon: <CalendarDays className="h-4 w-4" />,
    },
    {
      id: "alerts",
      label: "Alertas",
      icon: <Bell className="h-4 w-4" />,
      count: alertCount > 0 ? alertCount : undefined,
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 border-r border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#0E1116] h-screen sticky top-0 select-none">
      <div className="px-4 h-16 flex items-center justify-between border-b border-neutral-200 dark:border-white/[0.08]">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectView("inventory");
          }}
          className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap shrink-0"
        >
          <BrandMark className="h-7 w-7" />
          <span className="font-display">Garantia</span>
        </a>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onAddProduct}
          className="w-full min-h-[40px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar produto</span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-1 space-y-1" aria-label="Navegação principal">
        {navItems.map((item) => {
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`w-full min-h-[38px] px-3 rounded-lg flex items-center justify-between text-sm font-medium whitespace-nowrap ${
                active
                  ? "bg-neutral-100 dark:bg-white/[0.08] text-neutral-900 dark:text-white"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/70 dark:hover:bg-white/[0.04] hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={active ? "text-emerald-600 dark:text-emerald-400" : ""}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </span>
              {item.count !== undefined && (
                <span
                  className={`font-mono-num text-xs ${
                    item.id === "alerts" && item.count > 0
                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-neutral-400 dark:text-neutral-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-neutral-200 dark:border-white/[0.08] space-y-1">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {user.full_name || "Conta Garantia"}
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full min-h-[36px] px-3 rounded-lg flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.05] hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap"
        >
          <Settings className="h-4 w-4" />
          <span>Conta e backup</span>
        </button>

        <button
          type="button"
          onClick={onOpenVersions}
          className="w-full min-h-[36px] px-3 rounded-lg flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.05] hover:text-neutral-900 dark:hover:text-neutral-100 whitespace-nowrap"
        >
          <span className="flex items-center gap-2.5">
            <History className="h-4 w-4" />
            <span>Versões</span>
          </span>
          <span className="font-mono-num text-xs text-neutral-400 dark:text-neutral-500">
            {appVersion}
          </span>
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="w-full min-h-[36px] px-3 rounded-lg flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>

        <p className="px-3 pt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
          Garantia · BoRan Studio
        </p>
      </div>
    </aside>
  );
};
