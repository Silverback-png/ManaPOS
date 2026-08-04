import { PaymentType, Sale, SaleItem } from '../../shared/types/domain';
import { getDatabase } from '../database';

/**
 * Data access for sales and sale_items. A sale and its lines are always
 * written inside ONE transaction — the database can never contain a sale
 * with missing lines, or orphan lines without a sale.
 */
export interface SaleWriteData {
  businessDayId: number;
  paymentType: PaymentType;
  subtotalCents: number;
  vatTotalCents: number;
  totalCents: number;
  costTotalCents: number;
  createdAt: string;
}

export interface SaleItemWriteData {
  productId: number;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  costPriceCents: number;
  vatRatePercent: number;
  vatAmountCents: number;
  lineTotalCents: number;
}

interface SaleRow {
  id: number;
  receipt_number: number;
  business_day_id: number;
  payment_type: PaymentType;
  status: 'completed' | 'voided';
  subtotal_cents: number;
  vat_total_cents: number;
  total_cents: number;
  cost_total_cents: number;
  created_at: string;
}

interface SaleItemRow {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
  cost_price_cents: number;
  vat_rate_percent: number;
  vat_amount_cents: number;
  line_total_cents: number;
}

function mapSaleRow(row: SaleRow): Sale {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    businessDayId: row.business_day_id,
    paymentType: row.payment_type,
    status: row.status,
    subtotalCents: row.subtotal_cents,
    vatTotalCents: row.vat_total_cents,
    totalCents: row.total_cents,
    costTotalCents: row.cost_total_cents,
    createdAt: row.created_at
  };
}

function mapSaleItemRow(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    costPriceCents: row.cost_price_cents,
    vatRatePercent: row.vat_rate_percent,
    vatAmountCents: row.vat_amount_cents,
    lineTotalCents: row.line_total_cents
  };
}

export function createSaleWithItems(sale: SaleWriteData, items: SaleItemWriteData[]): Sale {
  const db = getDatabase();

  const nextReceiptNumber = db.prepare(
    'SELECT COALESCE(MAX(receipt_number), 0) + 1 AS next FROM sales'
  );
  const insertSale = db.prepare(
    `INSERT INTO sales
       (receipt_number, business_day_id, payment_type, status,
        subtotal_cents, vat_total_cents, total_cents, cost_total_cents, created_at)
     VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO sale_items
       (sale_id, product_id, product_name, quantity, unit_price_cents,
        cost_price_cents, vat_rate_percent, vat_amount_cents, line_total_cents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const run = db.transaction((): number => {
    const receiptNumber = (nextReceiptNumber.get() as { next: number }).next;
    const result = insertSale.run(
      receiptNumber,
      sale.businessDayId,
      sale.paymentType,
      sale.subtotalCents,
      sale.vatTotalCents,
      sale.totalCents,
      sale.costTotalCents,
      sale.createdAt
    );
    const saleId = Number(result.lastInsertRowid);

    for (const item of items) {
      insertItem.run(
        saleId,
        item.productId,
        item.productName,
        item.quantity,
        item.unitPriceCents,
        item.costPriceCents,
        item.vatRatePercent,
        item.vatAmountCents,
        item.lineTotalCents
      );
    }

    return saleId;
  });

  const saleId = run();
  return getSaleById(saleId)!;
}

export function getSaleById(id: number): Sale | null {
  const row = getDatabase().prepare('SELECT * FROM sales WHERE id = ?').get(id) as
    | SaleRow
    | undefined;
  return row ? mapSaleRow(row) : null;
}

export function listSaleItems(saleId: number): SaleItem[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id ASC')
    .all(saleId) as SaleItemRow[];
  return rows.map(mapSaleItemRow);
}

/** All completed sales of one business day — the basis of End of Day math. */
export function listCompletedSalesByBusinessDay(businessDayId: number): Sale[] {
  const rows = getDatabase()
    .prepare(
      "SELECT * FROM sales WHERE business_day_id = ? AND status = 'completed' ORDER BY id ASC"
    )
    .all(businessDayId) as SaleRow[];
  return rows.map(mapSaleRow);
}
