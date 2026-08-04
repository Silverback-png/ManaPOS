import { AuditAction, AuditListFilter, AuditLogEntry } from '../../shared/types/domain';
import * as auditRepository from '../repositories/auditRepository';
import { currentTimestamp } from '../utils/time';

/** Hard cap so the viewer can never pull an unbounded history into memory. */
const MAX_AUDIT_LIST_LIMIT = 500;
const DEFAULT_AUDIT_LIST_LIMIT = 200;

/**
 * Central audit logging. Every sensitive operation in the app calls this —
 * price changes, product edits, voids, settings changes, End of Day.
 *
 * `details` is stored as JSON so each action type can carry its own
 * context (before/after values, reasons, snapshots).
 */
export function log(
  action: AuditAction,
  entityType: string,
  entityId: number | string | null,
  details: unknown
): void {
  auditRepository.insertAuditEntry({
    action,
    entityType,
    entityId: entityId === null ? null : String(entityId),
    details: JSON.stringify(details),
    createdAt: currentTimestamp()
  });
}

export function listEntries(filter: AuditListFilter): AuditLogEntry[] {
  const requested = filter.limit ?? DEFAULT_AUDIT_LIST_LIMIT;
  const limit = Math.min(Math.max(1, requested), MAX_AUDIT_LIST_LIMIT);
  return auditRepository.listAuditEntries({ limit, action: filter.action });
}
