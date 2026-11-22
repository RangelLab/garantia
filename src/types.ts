export type AppTheme = "dark" | "light";

export type WarrantyStatus = "active" | "soon" | "expired";

export type ProductCategory =
  | "Eletrônicos"
  | "Eletrodomésticos"
  | "Informática"
  | "Casa & Móveis"
  | "Ferramentas"
  | "Outros";

export interface User {
  id: string;
  email: string;
  full_name?: string;
}

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RawProduct {
  id: string;
  user_id: string;
  name: string;
  store?: string;
  model?: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  notes?: string;
  receipt_path?: string | null;
  category?: string;
  price?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface WarrantyProduct extends RawProduct {
  category: ProductCategory;
  price: number | null;
  plainNotes: string;
  daysRemaining: number;
  status: WarrantyStatus;
  progressPercent: number;
}

export type ActiveView = "inventory" | "calendar" | "alerts";
export type InventoryLayout = "list" | "grid";
export type StatusFilter = "all" | WarrantyStatus;
export type SortOption = "expiry_asc" | "price_desc" | "purchase_desc" | "name_asc";

export interface VersionEntry {
  version: string;
  date: string;
  timestamp?: string;
  title?: string;
  changes: string[];
}

export interface BackupFilePayload {
  app: string;
  version: number;
  exportedAt: string;
  products: Array<{
    name: string;
    store?: string;
    model?: string;
    purchase_date?: string;
    purchaseDate?: string;
    warranty_months?: number;
    warrantyMonths?: number;
    expiry_date?: string;
    notes?: string;
    category?: string;
    price?: number | null;
    receipt_path?: string | null;
    receipt?: {
      name: string;
      type: string;
      data: string;
    } | null;
  }>;
}
