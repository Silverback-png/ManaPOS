import { Product, ProductFilter } from '../../shared/types/domain';
import { getDatabase } from '../database';

/**
 * Data access for products. The ONLY file that knows how products are stored.
 * Products are never hard-deleted anywhere in the app — is_active only.
 */
export interface ProductWriteData {
  name: string;
  categoryId: number;
  costPriceCents: number;
  sellingPriceCents: number;
  barcode: string | null;
}

interface ProductRow {
  id: number;
  name: string;
  category_id: number;
  cost_price_cents: number;
  selling_price_cents: number;
  barcode: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    costPriceCents: row.cost_price_cents,
    sellingPriceCents: row.selling_price_cents,
    barcode: row.barcode,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listProducts(filter: ProductFilter): Product[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (!filter.includeInactive) {
    conditions.push('is_active = 1');
  }
  if (filter.categoryId !== undefined) {
    conditions.push('category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.search && filter.search.trim().length > 0) {
    conditions.push("name LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(filter.search.trim())}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = getDatabase()
    .prepare(`SELECT * FROM products ${where} ORDER BY name ASC, id ASC`)
    .all(...params) as ProductRow[];

  return rows.map(mapRow);
}

export function getProductById(id: number): Product | null {
  const row = getDatabase().prepare('SELECT * FROM products WHERE id = ?').get(id) as
    | ProductRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function insertProduct(data: ProductWriteData, timestamp: string): Product {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO products
         (name, category_id, cost_price_cents, selling_price_cents, barcode, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .run(
      data.name,
      data.categoryId,
      data.costPriceCents,
      data.sellingPriceCents,
      data.barcode,
      timestamp,
      timestamp
    );
  return getProductById(Number(result.lastInsertRowid))!;
}

export function updateProduct(id: number, data: ProductWriteData, timestamp: string): void {
  getDatabase()
    .prepare(
      `UPDATE products
       SET name = ?, category_id = ?, cost_price_cents = ?, selling_price_cents = ?,
           barcode = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      data.name,
      data.categoryId,
      data.costPriceCents,
      data.sellingPriceCents,
      data.barcode,
      timestamp,
      id
    );
}

export function setProductActive(id: number, isActive: boolean, timestamp: string): void {
  getDatabase()
    .prepare('UPDATE products SET is_active = ?, updated_at = ? WHERE id = ?')
    .run(isActive ? 1 : 0, timestamp, id);
}

/** LIKE wildcards in user search input must be literal, not wildcards. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
