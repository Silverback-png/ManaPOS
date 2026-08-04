/**
 * Domain model shared by every process (main, preload, renderer).
 *
 * Convention: camelCase here. Repositories map snake_case database rows to
 * these types in exactly one place, so the rest of the app never sees
 * database naming. All money is integer cents. All timestamps are local
 * ISO-8601 strings with offset (see utils/time.ts).
 */

// ---------------------------------------------------------------- Categories

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
}

export interface RenameCategoryInput {
  id: number;
  name: string;
}

export interface SetCategoryActiveInput {
  id: number;
  isActive: boolean;
}

export interface DeleteCategoryInput {
  id: number;
}

export interface ReorderCategoriesInput {
  /** Category ids in their new display order. */
  orderedIds: number[];
}

// ------------------------------------------------------------------ Products

export interface Product {
  id: number;
  name: string;
  categoryId: number;
  costPriceCents: number;
  sellingPriceCents: number;
  barcode: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  categoryId: number;
  costPriceCents: number;
  sellingPriceCents: number;
  barcode?: string | null;
}

export interface UpdateProductInput extends CreateProductInput {
  id: number;
}

export interface SetProductActiveInput {
  id: number;
  isActive: boolean;
}

export interface ProductFilter {
  search?: string;
  categoryId?: number;
  includeInactive?: boolean;
}

// --------------------------------------------------------------------- Sales

export type PaymentType = 'cash' | 'card' | 'mixed';
export type SaleStatus = 'completed' | 'voided';

export interface Sale {
  id: number;
  receiptNumber: number;
  businessDayId: number;
  paymentType: PaymentType;
  status: SaleStatus;
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
  costTotalCents: number;
  createdAt: string;
}

/**
 * A historical snapshot — these values are frozen at the moment of sale and
 * never change, even if the product is edited or deactivated later.
 */
export interface SaleItem {
  id: number;
  saleId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents: number;
  vatRatePercent: number;
  vatAmountCents: number;
  lineTotalCents: number;
}

/** One line of the cart as sent to the main process at checkout. */
export interface CartLineInput {
  productId: number;
  quantity: number;
}

export interface CompleteSaleInput {
  paymentType: PaymentType;
  lines: CartLineInput[];
}

/** What the renderer receives after a successful checkout. */
export interface CompletedSale {
  sale: Sale;
  items: SaleItem[];
  receiptPdfPath: string;
}

// ------------------------------------------------------------ Business days

export type BusinessDayStatus = 'open' | 'closed';

export interface BusinessDay {
  id: number;
  businessDate: string;
  status: BusinessDayStatus;
  openedAt: string;
  closedAt: string | null;
}

// --------------------------------------------------------------------- Voids

export type VoidType = 'item' | 'sale';

export interface VoidRecord {
  id: number;
  businessDayId: number;
  saleId: number | null;
  voidType: VoidType;
  details: string;
  amountCents: number;
  reason: string;
  createdAt: string;
}

/** Voids in v1 are pre-checkout (cart) voids — no sale_id is attached. */
export interface VoidCartItemInput {
  productName: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
  reason: string;
  managerPin: string;
}

export interface VoidCartSaleLine {
  productName: string;
  quantity: number;
  amountCents: number;
}

export interface VoidCartSaleInput {
  lines: VoidCartSaleLine[];
  amountCents: number;
  reason: string;
  managerPin: string;
}

// ---------------------------------------------------------------- Audit log

export type AuditAction =
  | 'product_create'
  | 'product_edit'
  | 'price_change'
  | 'product_deactivate'
  | 'product_reactivate'
  | 'category_create'
  | 'category_rename'
  | 'category_delete'
  | 'category_toggle'
  | 'category_reorder'
  | 'void'
  | 'settings_change'
  | 'end_of_day';

export interface AuditLogEntry {
  id: number;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details: string;
  createdAt: string;
}

export interface AuditListFilter {
  limit?: number;
  action?: AuditAction;
}

// ----------------------------------------------------------------- Settings

export interface AppSettings {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  vatRatePercent: number;
  receiptFooter: string;
  managerPin: string;
  currencySymbol: string;
}

export type UpdateSettingsInput = AppSettings;

// ----------------------------------------------------------------- Reports

export interface TopSellingProduct {
  productName: string;
  quantitySold: number;
  grossCents: number;
}

export interface EndOfDayReport {
  businessDate: string;
  grossSalesCents: number;
  costOfGoodsSoldCents: number;
  grossProfitCents: number;
  vatTotalCents: number;
  voidTotalCents: number;
  voidCount: number;
  transactionCount: number;
  averageSaleCents: number;
  topProducts: TopSellingProduct[];
}

export interface EndOfDayResult {
  report: EndOfDayReport;
  pdfPath: string;
  backupPath: string;
}
