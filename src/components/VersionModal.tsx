import React from "react";
import { X } from "lucide-react";
import type { VersionEntry } from "../types";

interface VersionModalProps {
  open: boolean;
  appVersion: string;
  history: VersionEntry[];
  onClose: () => void;
}

export const VersionModal: React.FC<VersionModalProps> = ({
  open,
  appVersion,
  history,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] flex flex-col overflow-hidden shadow-2xl pb-safe">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-neutral-300 dark:bg-white/15 sm:hidden shrink-0" />

        <div className="px-5 py-4 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Garantia By BoRan Studio
            </p>
            <h2
              id="version-modal-title"
              className="font-display text-lg font-bold text-neutral-900 dark:text-white"
            >
              Histórico de versões
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

        <div className="px-5 py-3 border-b border-neutral-200 dark:border-white/[0.06] flex items-center justify-between text-xs bg-neutral-50 dark:bg-white/[0.02] shrink-0">
          <span className="text-neutral-500 dark:text-neutral-400">Versão instalada</span>
          <strong className="font-mono-num text-sm text-emerald-700 dark:text-emerald-400">
            {appVersion}
          </strong>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-neutral-200 dark:divide-white/[0.06]">
          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Não foi possível carregar o histórico de versões.
            </p>
          ) : (
            history.map((entry) => (
              <div key={entry.version} className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <strong className="font-mono-num text-sm text-emerald-700 dark:text-emerald-400">
                    v{entry.version}
                  </strong>
                  <time
                    dateTime={entry.date}
                    className="font-mono-num text-xs text-neutral-500 dark:text-neutral-400"
                  >
                    {new Date(`${entry.date}T12:00:00`).toLocaleDateString("pt-BR")}
                  </time>
                </div>
                <h3 className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {entry.title || "Atualização"}
                </h3>
                <ul className="mt-2 space-y-1 list-disc pl-4 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {entry.changes.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
