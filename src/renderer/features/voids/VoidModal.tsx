import { FormEvent, useState } from 'react';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

interface VoidModalProps {
  title: string;
  /** What is being voided, line by line. */
  lines: Array<{ label: string; amountCents: number }>;
  totalCents: number;
  currencySymbol: string;
  confirmLabel: string;
  /** Throws on failure (wrong PIN, validation) — the modal displays the error. */
  onConfirm: (pin: string, reason: string) => Promise<void>;
  onClose: () => void;
}

const QUICK_REASONS = ['Wrong item', 'Customer changed mind', 'Entered by mistake'];

/**
 * Manager authorisation dialog for voids: shows exactly what will be
 * voided, requires a reason and the 4-digit manager PIN.
 */
export function VoidModal({
  title,
  lines,
  totalCents,
  currencySymbol,
  confirmLabel,
  onConfirm,
  onClose
}: VoidModalProps): JSX.Element {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canConfirm = /^\d{4}$/.test(pin) && reason.trim().length >= 2 && !busy;

  async function handleConfirm(event?: FormEvent): Promise<void> {
    event?.preventDefault();
    if (!canConfirm) return;

    setBusy(true);
    setError(null);
    try {
      await onConfirm(pin, reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      setPin('');
    }
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="void-form"
            variant="danger"
            disabled={!canConfirm}
          >
            {busy ? 'Recording…' : confirmLabel}
          </Button>
        </>
      }
    >
      <form id="void-form" onSubmit={(e) => void handleConfirm(e)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* What is being voided */}
        <div className="rounded-lg bg-base px-4 py-3 text-sm">
          <div className="space-y-1">
            {lines.map((line, index) => (
              <div key={index} className="flex justify-between gap-4">
                <span className="truncate text-gray-200">{line.label}</span>
                <span className="font-mono text-muted">
                  {formatCurrency(line.amountCents, currencySymbol)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-edge pt-2 font-semibold">
            <span>Void total</span>
            <span className="font-mono text-danger">
              {formatCurrency(totalCents, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="void-reason" className="mb-1.5 block text-sm font-medium text-gray-300">
            Reason <span className="text-danger">*</span>
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((quickReason) => (
              <button
                key={quickReason}
                type="button"
                onClick={() => setReason(quickReason)}
                className="rounded-full border border-edge bg-panel px-2.5 py-1 text-xs text-muted transition-colors hover:border-edge-light hover:text-gray-100"
              >
                {quickReason}
              </button>
            ))}
          </div>
          <input
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="Why is this being voided?"
            className="w-full rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 placeholder-muted focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Manager PIN */}
        <div>
          <label htmlFor="void-pin" className="mb-1.5 block text-sm font-medium text-gray-300">
            Manager PIN <span className="text-danger">*</span>
          </label>
          <input
            id="void-pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            autoFocus
            className="w-full rounded-lg border border-edge bg-base px-3.5 py-2.5 text-center text-lg font-bold tracking-[0.5em] text-gray-100 placeholder-muted focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <p className="mt-1.5 text-xs text-muted">
            This void is recorded permanently in the audit log.
          </p>
        </div>
      </form>
    </Modal>
  );
}
