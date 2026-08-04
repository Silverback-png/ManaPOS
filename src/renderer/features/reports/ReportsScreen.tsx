import { useCallback, useEffect, useState } from 'react';
import type { AuditAction, AuditLogEntry, BusinessDay, EndOfDayReport, EndOfDayResult } from '@shared/types/domain';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { EndOfDayReportView } from './EndOfDayReportView';

const ACTION_OPTIONS: Array<{ value: '' | AuditAction; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'void', label: 'Voids' },
  { value: 'price_change', label: 'Price changes' },
  { value: 'product_create', label: 'Product created' },
  { value: 'product_edit', label: 'Product edits' },
  { value: 'product_deactivate', label: 'Product deactivations' },
  { value: 'product_reactivate', label: 'Product reactivations' },
  { value: 'category_create', label: 'Category created' },
  { value: 'category_rename', label: 'Category renames' },
  { value: 'category_delete', label: 'Category deletions' },
  { value: 'category_toggle', label: 'Category toggles' },
  { value: 'category_reorder', label: 'Category reorders' },
  { value: 'settings_change', label: 'Settings changes' },
  { value: 'end_of_day', label: 'End of Day' }
];

const ACTION_BADGE_CLASSES: Partial<Record<AuditAction, string>> = {
  void: 'bg-danger-muted text-danger',
  price_change: 'bg-accent-muted text-warning',
  settings_change: 'bg-panel-hover text-muted',
  end_of_day: 'bg-accent-muted text-accent'
};

const DEFAULT_BADGE_CLASS = 'bg-panel-hover text-gray-300';

type EodState = 'idle' | 'confirm' | 'processing' | { done: EndOfDayResult };

/**
 * Reports screen: End of Day controls, business day history with
 * viewable historical reports, and the audit trail.
 */
export default function ReportsScreen(): JSX.Element {
  const [currencySymbol, setCurrencySymbol] = useState('R');
  const [currentDay, setCurrentDay] = useState<BusinessDay | null>(null);
  const [businessDays, setBusinessDays] = useState<BusinessDay[]>([]);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<'' | AuditAction>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eodState, setEodState] = useState<EodState>('idle');
  const [viewingReport, setViewingReport] = useState<{
    day: BusinessDay;
    report: EndOfDayReport;
  } | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<number | null>(null);

  const loadAll = useCallback((): void => {
    setLoading(true);
    Promise.all([
      api.settings.get(),
      api.businessDay.getCurrent(),
      api.reports.listBusinessDays(),
      api.audit.list({ limit: 200, action: actionFilter === '' ? undefined : actionFilter })
    ])
      .then(([settings, openDay, days, auditEntries]) => {
        setCurrencySymbol(settings.currencySymbol);
        setCurrentDay(openDay);
        setBusinessDays(days);
        setEntries(auditEntries);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [actionFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handlePerformEndOfDay(): Promise<void> {
    setEodState('processing');
    setError(null);
    try {
      const result = await api.businessDay.performEndOfDay();
      setEodState({ done: result });
      loadAll(); // the day rolled over — refresh everything
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEodState('idle');
    }
  }

  async function handleViewReport(day: BusinessDay): Promise<void> {
    setLoadingReportId(day.id);
    setError(null);
    try {
      const report = await api.reports.getEndOfDayReport({ businessDayId: day.id });
      setViewingReport({ day, report });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingReportId(null);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* ---------------------------------------------------- End of Day */}
        <Card
          title="End of Day"
          description="Closes the current business day: generates the EOD report PDF, backs up the database, and starts the next day automatically."
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="text-muted">Current business day: </span>
              {currentDay ? (
                <span className="font-semibold text-gray-100">{currentDay.businessDate}</span>
              ) : (
                <span className="text-muted">…</span>
              )}
              {currentDay && (
                <span className="ml-2 rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium text-accent">
                  open
                </span>
              )}
            </div>
            <Button
              variant="danger"
              onClick={() => setEodState('confirm')}
              disabled={!currentDay}
            >
              Perform End of Day
            </Button>
          </div>
        </Card>

        {/* ---------------------------------------------- Business day history */}
        <Card title="Business days">
          {loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : businessDays.length === 0 ? (
            <p className="text-sm text-muted">No business days yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Opened</th>
                  <th className="pb-3 pr-4 font-medium">Closed</th>
                  <th className="pb-3 font-medium text-right">Report</th>
                </tr>
              </thead>
              <tbody>
                {businessDays.map((day) => (
                  <tr key={day.id} className="border-b border-edge/50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-100">{day.businessDate}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                          (day.status === 'open'
                            ? 'bg-accent-muted text-accent'
                            : 'bg-panel-hover text-muted')
                        }
                      >
                        {day.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">{formatDateTime(day.openedAt)}</td>
                    <td className="py-2.5 pr-4 text-muted">
                      {day.closedAt ? formatDateTime(day.closedAt) : '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={loadingReportId === day.id}
                        onClick={() => void handleViewReport(day)}
                      >
                        {loadingReportId === day.id ? 'Loading…' : 'View report'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* ------------------------------------------------------- Audit log */}
        <Card>
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as '' | AuditAction)}
              className="rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="flex-1 text-xs text-muted">
              Showing the latest {entries.length} entries (max 200)
            </span>
            <Button variant="secondary" size="sm" onClick={loadAll}>
              Refresh
            </Button>
          </div>
        </Card>

        <Card title="Audit log">
          {loading ? (
            <p className="text-sm text-muted">Loading audit log…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted">No audit entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-medium">Time</th>
                  <th className="pb-3 pr-4 font-medium">Action</th>
                  <th className="pb-3 pr-4 font-medium">Entity</th>
                  <th className="pb-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-edge/50 align-top last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-4 text-muted">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                          (ACTION_BADGE_CLASSES[entry.action] ?? DEFAULT_BADGE_CLASS)
                        }
                      >
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted">
                      {entry.entityType}
                      {entry.entityId !== null && (
                        <span className="text-edge-light"> #{entry.entityId}</span>
                      )}
                    </td>
                    <td className="max-w-md py-2.5">
                      <code className="block truncate text-xs text-muted" title={entry.details}>
                        {entry.details}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------- EOD confirm modal */}
      {eodState === 'confirm' && currentDay && (
        <Modal
          title="Perform End of Day?"
          onClose={() => setEodState('idle')}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEodState('idle')}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void handlePerformEndOfDay()}>
                Close the day
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-gray-200">
            This will close business day{' '}
            <span className="font-semibold text-gray-100">{currentDay.businessDate}</span>:
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted">
            <li>Generate the End of Day report PDF</li>
            <li>Back up the database</li>
            <li>Write the End of Day audit entry</li>
            <li>Start the next business day automatically</li>
          </ul>
        </Modal>
      )}

      {/* ---------------------------------------------- EOD processing modal */}
      {eodState === 'processing' && (
        <Modal title="Performing End of Day…" onClose={() => undefined} size="sm">
          <p className="text-sm text-muted">
            Generating the report, backing up the database and opening the next day…
          </p>
        </Modal>
      )}

      {/* ------------------------------------------------- EOD success modal */}
      {typeof eodState === 'object' && (
        <Modal
          title="End of Day complete"
          onClose={() => setEodState('idle')}
          size="lg"
          footer={
            <Button onClick={() => setEodState('idle')}>Done</Button>
          }
        >
          <div className="space-y-4">
            <EndOfDayReportView
              report={eodState.done.report}
              currencySymbol={currencySymbol}
            />
            <div className="space-y-1 rounded-lg bg-base px-3.5 py-2.5 text-xs text-muted">
              <p className="break-all">Report PDF: {eodState.done.pdfPath}</p>
              <p className="break-all">Database backup: {eodState.done.backupPath}</p>
            </div>
          </div>
        </Modal>
      )}

      {/* ------------------------------------------ Historical report modal */}
      {viewingReport && (
        <Modal
          title={`Report — ${viewingReport.day.businessDate}`}
          onClose={() => setViewingReport(null)}
          size="lg"
          footer={<Button onClick={() => setViewingReport(null)}>Close</Button>}
        >
          <EndOfDayReportView report={viewingReport.report} currencySymbol={currencySymbol} />
        </Modal>
      )}
    </main>
  );
}
