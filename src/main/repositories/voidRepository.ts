import { VoidRecord, VoidType } from '../../shared/types/domain';
import { getDatabase } from '../database';

/**
 * Data access for voids. Void records are INSERT-only — like the audit
 * trail, they exist for accountability and are never edited or deleted.
 */
export interface VoidWriteData {
  businessDayId: number;
  saleId: number | null;
  voidType: VoidType;
  details: string;
  amountCents: number;
  reason: string;
  createdAt: string;
}

interface VoidRow {
  id: number;
  business_day_id: number;
  sale_id: number | null;
  void_type: VoidType;
  details: string;
  amount_cents: number;
  reason: string;
  created_at: string;
}

function mapRow(row: VoidRow): VoidRecord {
  return {
    id: row.id,
    businessDayId: row.business_day_id,
    saleId: row.sale_id,
    voidType: row.void_type,
    details: row.details,
    amountCents: row.amount_cents,
    reason: row.reason,
    createdAt: row.created_at
  };
}

export function insertVoid(data: VoidWriteData): VoidRecord {
  const db = getDatabase();
  const result = db
    .prepare(
      `INSERT INTO voids (business_day_id, sale_id, void_type, details, amount_cents, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.businessDayId,
      data.saleId,
      data.voidType,
      data.details,
      data.amountCents,
      data.reason,
      data.createdAt
    );
  return getVoidById(Number(result.lastInsertRowid))!;
}

export function getVoidById(id: number): VoidRecord | null {
  const row = getDatabase().prepare('SELECT * FROM voids WHERE id = ?').get(id) as
    | VoidRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function listVoidsByBusinessDay(businessDayId: number): VoidRecord[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM voids WHERE business_day_id = ? ORDER BY id ASC')
    .all(businessDayId) as VoidRow[];
  return rows.map(mapRow);
}
