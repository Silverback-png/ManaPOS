import { Category } from '../../shared/types/domain';
import { getDatabase } from '../database';

/**
 * Data access for categories. This is the ONLY file that knows how
 * categories are stored — snake_case rows are mapped to the domain model here.
 */
interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function listCategories(): Category[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC')
    .all() as CategoryRow[];
  return rows.map(mapRow);
}

export function getCategoryById(id: number): Category | null {
  const row = getDatabase().prepare('SELECT * FROM categories WHERE id = ?').get(id) as
    | CategoryRow
    | undefined;
  return row ? mapRow(row) : null;
}

/** Case-insensitive uniqueness check (matches the column's COLLATE NOCASE). */
export function categoryNameExists(name: string, excludeId?: number): boolean {
  const db = getDatabase();
  const row =
    excludeId === undefined
      ? db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(name)
      : db
          .prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE AND id != ?')
          .get(name, excludeId);
  return row !== undefined;
}

export function getNextSortOrder(): number {
  const row = getDatabase()
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM categories')
    .get() as { next: number };
  return row.next;
}

export function insertCategory(name: string, sortOrder: number, timestamp: string): Category {
  const db = getDatabase();
  const result = db
    .prepare(
      'INSERT INTO categories (name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)'
    )
    .run(name, sortOrder, timestamp, timestamp);
  return getCategoryById(Number(result.lastInsertRowid))!;
}

export function updateCategoryName(id: number, name: string, updatedAt: string): void {
  getDatabase()
    .prepare('UPDATE categories SET name = ?, updated_at = ? WHERE id = ?')
    .run(name, updatedAt, id);
}

export function updateCategoryActive(id: number, isActive: boolean, updatedAt: string): void {
  getDatabase()
    .prepare('UPDATE categories SET is_active = ?, updated_at = ? WHERE id = ?')
    .run(isActive ? 1 : 0, updatedAt, id);
}

export function deleteCategory(id: number): void {
  getDatabase().prepare('DELETE FROM categories WHERE id = ?').run(id);
}

/** Rewrites sort_order to match the given id sequence, atomically. */
export function updateSortOrders(orderedIds: readonly number[], updatedAt: string): void {
  const db = getDatabase();
  const statement = db.prepare('UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ?');

  const updateAll = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      statement.run(index + 1, updatedAt, id);
    });
  });

  updateAll();
}

export function countProductsInCategory(categoryId: number): number {
  const row = getDatabase()
    .prepare('SELECT COUNT(*) AS count FROM products WHERE category_id = ?')
    .get(categoryId) as { count: number };
  return row.count;
}
