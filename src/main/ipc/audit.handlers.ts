import { AuditListFilter, AuditLogEntry } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as auditService from '../services/auditService';
import { handle } from './handle';

export function registerAuditHandlers(): void {
  handle<AuditListFilter, AuditLogEntry[]>(IpcChannels.audit.list, (input) =>
    auditService.listEntries(input)
  );
}
