import React, { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api, friendlyError } from "../lib/api";
import { isPdfPath, receiptDisplayName } from "../lib/warranty";
import type { WarrantyProduct } from "../types";

interface ReceiptViewerModalProps {
  product: WarrantyProduct | null;
  onClose: () => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  product,
  onClose,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!product?.receipt_path) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSignedUrl(null);
    setZoom(1);
    setRotation(0);

    const path = product.receipt_path;
    const guessedPdf = isPdfPath(path);
    setIsPdf(guessedPdf);

    api<{ url: string }>("receipt_signed_url", { path })
      .then((res) => {
        if (cancelled) return;
        setSignedUrl(res.url);
        if (!guessedPdf && res.url.toLowerCase().includes(".pdf")) {
          setIsPdf(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(friendlyError(err, "Não foi possível carregar o comprovante."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [product]);

  if (!product || !product.receipt_path) return null;

  async function handleDownload() {
    if (!signedUrl || !product?.receipt_path) return;
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = receiptDisplayName(product.receipt_path) || "comprovante";
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-viewer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-4xl h-[90vh] sm:h-[85vh] rounded-t-2xl sm:rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#12151A] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Toolbar */}
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2
              id="receipt-viewer-title"
              className="text-sm font-semibold text-neutral-900 dark:text-white truncate"
            >
              Comprovante · {product.name}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {receiptDisplayName(product.receipt_path)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isPdf && signedUrl && (
              <>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                  aria-label="Diminuir zoom"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="hidden sm:inline-flex h-9 px-2.5 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 font-mono-num text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                  aria-label="Aumentar zoom"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Girar 90 graus"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}

            {signedUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  aria-label="Baixar comprovante"
                  className="flex h-9 px-3 items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Baixar</span>
                </button>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir em nova aba"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/[0.06]"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar visualizador"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewer Viewport */}
        <div className="flex-1 bg-neutral-100 dark:bg-[#090B0E] overflow-auto flex items-center justify-center p-4">
          {loading && (
            <div className="flex flex-col items-center gap-2.5 text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm">Carregando comprovante…</span>
            </div>
          )}

          {!loading && error && (
            <div className="text-center max-w-sm space-y-3">
              <FileText className="h-8 w-8 mx-auto text-red-500" />
              <p className="text-sm text-neutral-700 dark:text-neutral-300">{error}</p>
            </div>
          )}

          {!loading && !error && signedUrl && isPdf && (
            <div className="w-full h-full flex flex-col gap-3">
              <iframe
                src={signedUrl}
                title={`Comprovante PDF de ${product.name}`}
                className="w-full flex-1 rounded-lg border border-neutral-200 dark:border-white/10 bg-white"
              />
              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
                Caso o PDF não apareça no seu celular, use o botão Baixar ou Abrir acima.
              </p>
            </div>
          )}

          {!loading && !error && signedUrl && !isPdf && (
            <div className="w-full h-full overflow-auto flex items-center justify-center">
              <img
                src={signedUrl}
                alt={`Comprovante de ${product.name}`}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg transition-transform duration-150"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
