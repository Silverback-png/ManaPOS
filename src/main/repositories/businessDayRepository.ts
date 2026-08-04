import { BusinessDay } from '../../shared/types/domain';
import { getDatabase } from '../database';

/**
 * Data access for business days — the trading-day boundary every sale,
 * void and End of Day report hangs off.
 */
interface BusinessDayRow {
  id: number;
  business_date: string;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

function mapRow(row: BusinessDayRow): BusinessDay {
  return {
    id: row.id,
    businessDate: row.business_date,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at
  };
}

export function getOpenBusinessDay(): BusinessDay | null {
  const row = getDatabase()
    .prepare("SELECT * FROM business_days WHERE status = 'open' ORDER BY id DESC LIMIT 1")
    .get() as BusinessDayRow | undefined;
  return row ? mapRow(row) : null;
}

export function getBusinessDayById(id: number): BusinessDay | null {
  const row = getDatabase().prepare('SELECT * FROM business_days WHERE id = ?').get(id) as
    | BusinessDayRow
    | undefined;
  return row ? mapRow(row) : null;
}

export function listBusinessDays(): BusinessDay[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM business_days ORDER BY id DESC')
    .all() as BusinessDayRow[];
  return rows.map(mapRow);
}

export function closeBusinessDay(id: number, closedAt: string): void {
  getDatabase()
    .prepare("UPDATE business_days SET status = 'closed', closed_at = ? WHERE id = ?")
    .run(closedAt, id);
}

export function openBusinessDay(businessDate: string, openedAt: string): BusinessDay {
  const db = getDatabase();
  const result = db
    .prepare("INSERT INTO business_days (business_date, status, opened_at) VALUES (?, 'open', ?)")
    .run(businessDate, openedAt);
  return getBusinessDayById(Number(result.lastInsertRowid))!;
}
