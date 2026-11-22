import type { ProductCategory, RawProduct, WarrantyProduct, WarrantyStatus } from "../types";

export const SOON_DAYS = 30;
export const CRITICAL_DAYS = 7;
export const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_RECEIPT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "application/pdf",
]);

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Eletrônicos",
  "Eletrodomésticos",
  "Informática",
  "Casa & Móveis",
  "Ferramentas",
  "Outros",
];

export const QUICK_WARRANTY_PRESETS = [
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 ano", months: 12 },
  { label: "2 anos", months: 24 },
  { label: "3 anos", months: 36 },
];

const CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);
const META_REGEX = /^\[\[g:([^\]]*)\]\]\s*/;

export function normalizeCategory(value?: string | null): ProductCategory {
  if (value && CATEGORY_SET.has(value)) return value as ProductCategory;
  return "Outros";
}

export function decodeProductMetadata(product: RawProduct): {
  category: ProductCategory;
  price: number | null;
  plainNotes: string;
} {
  let category: ProductCategory = normalizeCategory(product.category);
  let price: number | null =
    typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0
      ? product.price
      : null;
  let plainNotes = product.notes || "";

  const match = META_REGEX.exec(plainNotes);
  if (match) {
    const entries = match[1].split("|");
    for (const part of entries) {
      const [key, ...rest] = part.split("=");
      const val = rest.join("=").trim();
      if (key === "cat" && val) {
        category = normalizeCategory(val);
      } else if (key === "val" && val) {
        const parsed = Number(val);
        if (Number.isFinite(parsed) && parsed >= 0) price = parsed;
      }
    }
    plainNotes = plainNotes.slice(match[0].length);
  }

  return { category, price, plainNotes };
}

export function encodeProductNotes(
  plainNotes: string,
  category: ProductCategory,
  price: number | null
): string {
  const cleanNotes = plainNotes.trim();
  const metaParts: string[] = [];
  if (category && category !== "Outros") {
    metaParts.push(`cat=${category}`);
  }
  if (price !== null && Number.isFinite(price) && price > 0) {
    metaParts.push(`val=${price.toFixed(2)}`);
  }

  if (!metaParts.length) {
    return cleanNotes.slice(0, 500);
  }

  const header = `[[g:${metaParts.join("|")}]]`;
  if (!cleanNotes) return header.slice(0, 500);
  const available = Math.max(0, 500 - header.length - 1);
  return `${header}\n${cleanNotes.slice(0, available)}`;
}

export function maxNotesLengthForMeta(category: ProductCategory, price: number | null): number {
  const metaParts: string[] = [];
  if (category && category !== "Outros") metaParts.push(`cat=${category}`);
  if (price !== null && Number.isFinite(price) && price > 0) metaParts.push(`val=${price.toFixed(2)}`);
  if (!metaParts.length) return 500;
  const headerLen = `[[g:${metaParts.join("|")}]]\n`.length;
  return Math.max(120, 500 - headerLen);
}

export function localDateString(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

export function addMonths(dateValue: string, months: number): string {
  const date = parseLocalDate(dateValue);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return localDateString(date);
}

export function dayDifference(dateValue: string): number {
  return Math.ceil(
    (parseLocalDate(dateValue).getTime() - parseLocalDate(localDateString()).getTime()) / 86400000
  );
}

export function formatDate(dateValue?: string | null): string {
  if (!dateValue) return "—";
  return parseLocalDate(dateValue)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .replace(" de ", " ");
}

export function formatDateShort(dateValue?: string | null): string {
  if (!dateValue) return "—";
  return parseLocalDate(dateValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const num = Number(normalized);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

export function statusOfDays(days: number): WarrantyStatus {
  if (days < 0) return "expired";
  if (days <= SOON_DAYS) return "soon";
  return "active";
}

export function daysCopy(days: number): string {
  if (days < 0) {
    const abs = Math.abs(days);
    return `Venceu há ${abs} ${abs === 1 ? "dia" : "dias"}`;
  }
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  return `${days} dias restantes`;
}

export function statusLabel(status: WarrantyStatus): string {
  if (status === "active") return "Em dia";
  if (status === "soon") return "Vencendo em breve";
  return "Expirada";
}

export function enrichProduct(raw: RawProduct): WarrantyProduct {
  const { category, price, plainNotes } = decodeProductMetadata(raw);
  const daysRemaining = dayDifference(raw.expiry_date);
  const status = statusOfDays(daysRemaining);
  const totalDays = Math.max(
    1,
    (parseLocalDate(raw.expiry_date).getTime() - parseLocalDate(raw.purchase_date).getTime()) / 86400000
  );
  const elapsed = Math.max(0, totalDays - Math.max(daysRemaining, 0));
  const progressPercent =
    status === "expired" ? 100 : Math.min(100, Math.max(4, (elapsed / totalDays) * 100));

  return {
    ...raw,
    category,
    price,
    plainNotes,
    daysRemaining,
    status,
    progressPercent,
  };
}

export function receiptDisplayName(path?: string | null): string {
  if (!path) return "";
  return path.split("/").pop()?.replace(/^[-\da-f]+-/, "") || "Comprovante anexado";
}

export function isPdfPath(path?: string | null, mimeType?: string | null): boolean {
  if (mimeType && mimeType.toLowerCase().includes("pdf")) return true;
  if (!path) return false;
  return /\.pdf($|\?)/i.test(path);
}
