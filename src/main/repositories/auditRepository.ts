import { AuditAction, AuditLogEntry } from '../../shared/types/domain';
import { getDatabase } from '../database';

export interface InsertAuditEntry {
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  details: string;
  createdAt: string;
}

interface AuditLogRow {
  id: number;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}

function mapRow(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
    createdAt: row.created_at
  };
}

/**
 * Data access for the audit log. Entries are INSERT-only by design:
 * an audit trail that can be edited is worthless.
 */
export function insertAuditEntry(entry: InsertAuditEntry): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO audit_logs (action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entry.action, entry.entityType, entry.entityId, entry.details, entry.createdAt);
}

/** Most recent first, optionally filtered to one action type. */
export function listAuditEntries(filter: { limit: number; action?: AuditAction }): AuditLogEntry[] {
  const db = getDatabase();
  const rows = (
    filter.action
      ? db
          .prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY id DESC LIMIT ?')
          .all(filter.action, filter.limit)
      : db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?').all(filter.limit)
  ) as AuditLogRow[];
  return rows.map(mapRow);
}
