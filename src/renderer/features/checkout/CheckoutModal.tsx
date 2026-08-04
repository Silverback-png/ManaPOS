import { useEffect, useState } from 'react';
import { toCents } from '@shared/money';
import type { CompletedSale } from '@shared/types/domain';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { getCartTotals, useCartStore } from '../../store/cartStore';

interface CheckoutModalProps {
  currencySymbol: string;
  onClose: () => void;
  /** Called once the sale has been persisted (and the receipt generated). */
  onCompleted: (result: CompletedSale) => void;
}

type PaymentSelection = 'cash' | 'card';

/**
 * Checkout dialog: payment type, cash tendered + change, then confirm.
 * 'Mixed' is displayed as a disabled placeholder per the v1 spec.
 */
export function CheckoutModal({
  currencySymbol,
  onClose,
  onCompleted
}: CheckoutModalProps): JSX.Element {
  const lines = useCartStore((s) => s.lines);
  const totals = getCartTotals(lines);

  const [paymentType, setPaymentType] = useState<PaymentSelection>('cash');
  const [tendered, setTendered] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompletedSale | null>(null);

  const tenderedNumber = tendered === '' ? null : Number(tendered);
  const tenderedValid = tenderedNumber !== null && Number.isFinite(tenderedNumber);
  const tenderedCents = tenderedValid ? toCents(tenderedNumber) : null;
  const changeCents =
    paymentType === 'cash' && tenderedCents !== null
      ? tenderedCents - totals.grandTotalCents
      : 0;
  const canConfirm =
    lines.length > 0 &&
    (paymentType === 'card' || (tenderedCents !== null && changeCents >= 0));

  useEffect(() => {
    if (paymentType === 'card') {
      setTendered('');
    }
  }, [paymentType]);

  async function handleConfirm(): Promise<void> {
    if (processing || !canConfirm) return;
    setProcessing(true);
    setError(null);
    try {
      const completed = await api.sales.complete({
        paymentType,
        lines: lines.map((line) => ({ productId: line.productId, quantity: line.quantity }))
      });
      setResult(completed);
      onCompleted(completed);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProcessing(false);
    }
  }

  // ---------------------------------------------------------- success view
  if (result) {
    return (
      <Modal title="Sale complete" onClose={onClose} size="sm">
        <div className="space-y-4 text-center">
          <div className="text-5xl text-accent">✓</div>
          <div>
            <p className="text-lg font-semibold">
              Receipt #{String(result.sale.receiptNumber).padStart(6, '0')}
            </p>
            <p className="mt-1 text-2xl font-bold text-accent">
              {formatCurrency(result.sale.totalCents, currencySymbol)}
            </p>
            <p className="mt-1 text-sm capitalize text-muted">{result.sale.paymentType}</p>
          </div>
          <p className="break-all rounded-lg bg-base px-3 py-2 text-xs text-muted">
            PDF saved to:
            <br />
            {result.receiptPdfPath}
          </p>
          <Button size="lg" className="w-full" onClick={onClose}>
            New sale
          </Button>
        </div>
      </Modal>
    );
  }

  // ---------------------------------------------------------- payment view
  return (
    <Modal
      title="Checkout"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!canConfirm || processing}>
            {processing ? 'Processing…' : 'Complete sale'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-baseline justify-between rounded-lg bg-base px-4 py-3">
          <span className="text-sm text-muted">
            {totals.totalItems} item{totals.totalItems === 1 ? '' : 's'}
          </span>
          <span className="text-2xl font-bold text-accent">
            {formatCurrency(totals.grandTotalCents, currencySymbol)}
          </span>
        </div>

        {/* Payment type */}
        <div className="grid grid-cols-3 gap-2">
          <PaymentButton
            label="Cash"
            selected={paymentType === 'cash'}
            onClick={() => setPaymentType('cash')}
          />
          <PaymentButton
            label="Card"
            selected={paymentType === 'card'}
            onClick={() => setPaymentType('card')}
          />
          <button
            type="button"
            disabled
            title="Mixed payments arrive in a later version"
            className="cursor-not-allowed rounded-lg border border-edge bg-panel px-3 py-2.5 text-sm font-semibold text-muted opacity-50"
          >
            Mixed
            <span className="block text-[10px] font-normal">soon</span>
          </button>
        </div>

        {/* Cash tendered */}
        {paymentType === 'cash' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="tendered" className="mb-1.5 block text-sm font-medium text-gray-300">
                Amount tendered
              </label>
              <input
                id="tendered"
                type="number"
                min="0"
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder={(totals.grandTotalCents / 100).toFixed(2)}
                autoFocus
                className="w-full rounded-lg border border-edge bg-base px-3.5 py-2.5 text-lg font-semibold text-gray-100 focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              <QuickAmount
                label="Exact"
                onClick={() => setTendered((totals.grandTotalCents / 100).toFixed(2))}
              />
              <QuickAmount label="R50" onClick={() => setTendered('50')} />
              <QuickAmount label="R100" onClick={() => setTendered('100')} />
              <QuickAmount label="R200" onClick={() => setTendered('200')} />
            </div>
            <div className="flex items-baseline justify-between rounded-lg bg-base px-4 py-3">
              <span className="text-sm text-muted">Change</span>
              <span
                className={
                  'text-xl font-bold ' +
                  (tenderedCents === null
                    ? 'text-muted'
                    : changeCents >= 0
                      ? 'text-accent'
                      : 'text-danger')
                }
              >
                {tenderedCents === null
                  ? '—'
                  : changeCents >= 0
                    ? formatCurrency(changeCents, currencySymbol)
                    : 'Insufficient'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function PaymentButton({
  label,
  selected,
  onClick
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ' +
        (selected
          ? 'border-accent bg-accent text-white'
          : 'border-edge bg-panel text-gray-200 hover:border-edge-light')
      }
    >
      {label}
    </button>
  );
}

function QuickAmount({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-edge bg-panel px-2 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-edge-light"
    >
      {label}
    </button>
  );
}
