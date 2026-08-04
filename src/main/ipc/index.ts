import { registerAppHandlers } from './app.handlers';
import { registerAuditHandlers } from './audit.handlers';
import { registerBusinessDayHandlers } from './businessDay.handlers';
import { registerCategoryHandlers } from './category.handlers';
import { registerProductHandlers } from './product.handlers';
import { registerReportHandlers } from './report.handlers';
import { registerSaleHandlers } from './sale.handlers';
import { registerSettingsHandlers } from './settings.handlers';
import { registerVoidHandlers } from './void.handlers';

/**
 * Central IPC registry. Each feature module adds its own
 * `registerXHandlers()` call here — one line per domain, so this file
 * documents the entire IPC surface at a glance.
 */
export function registerIpcHandlers(): void {
  registerAppHandlers();
  registerSettingsHandlers();
  registerCategoryHandlers();
  registerProductHandlers();
  registerSaleHandlers();
  registerBusinessDayHandlers();
  registerVoidHandlers();
  registerAuditHandlers();
  registerReportHandlers();
}
