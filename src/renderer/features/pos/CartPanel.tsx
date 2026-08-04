import { useState } from 'react';
import { extractVatCents } from '@shared/money';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { CheckoutModal } from '../checkout/CheckoutModal';
import { VoidModal } from '../voids/VoidModal';
import { api } from '../../lib/api';
import { CartLine, getCartTotals, useCartStore } from '../../store/cartStore';

interface CartPanelProps {
  currencySymbol: string;
  vatRatePercent: number;
}

type VoidTarget = { kind: 'item'; line: CartLine } | { kind: 'sale' } | null;

/**
 * The bottom shopping-cart strip: line items with quantity steppers on the
 * left, totals + sale actions on the right. Clicking a line selects it for
 * the PIN-gated "Void item" action.
 */
export function CartPanel({ currencySymbol, vatRatePercent }: CartPanelProps): JSX.Element {
  const lines = useCartStore((s) => s.lines);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [voidTarget, setVoidTarget] = useState<VoidTarget>(null);

  const totals = getCartTotals(lines);
  const vatCents = extractVatCents(totals.grandTotalCents, vatRatePercent);
  const isEmpty = lines.length === 0;
  const selectedLine = lines.find((line) => line.productId === selectedLineId) ?? null;

  async function handleVoidConfirm(pin: string, reason: string): Promise<void> {
    if (!voidTarget) return;

    if (voidTarget.kind === 'item') {
      const { line } = voidTarget;
      await api.voids.voidCartItem({
        productName: line.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        amountCents: line.quantity * line.unitPriceCents,
        reason,
        managerPin: pin
      });
      removeLine(line.productId);
      setSelectedLineId(null);
    } else {
      await api.voids.voidCartSale({
        lines: lines.map((line) => ({
          productName: line.name,
          quantity: line.quantity,
          amountCents: line.quantity * line.unitPriceCents
        })),
        amountCents: totals.grandTotalCents,
        reason,
        managerPin: pin
      });
      clear();
      setSelectedLineId(null);
    }
  }

  return (
    <section className="flex h-72 shrink-0 border-t border-edge bg-panel">
      {/* Line items */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">Cart is empty — click a product to start a sale.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left text-xs uppercase tracking-wide text-muted">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Quantity</th>
                <th className="pb-2 font-medium text-right">Unit Price</th>
                <th className="pb-2 font-medium text-right">Subtotal</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const isSelected = line.productId === selectedLineId;
                return (
                  <tr
                    key={line.productId}
                    onClick={() => setSelectedLineId(isSelected ? null : line.productId)}
                    className={
                      'cursor-pointer border-b border-edge/50 last:border-0 transition-colors ' +
                      (isSelected ? 'bg-accent-muted' : 'hover:bg-panel-hover')
                    }
                    title={isSelected ? 'Selected for void' : 'Click to select'}
                  >
                    <td className="py-2.5 pr-3 font-medium text-gray-100">{line.name}</td>
                    <td className="py-2.5 pr-3" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center rounded-lg border border-edge">
                        <button
                          type="button"
                          onClick={() => decrement(line.productId)}
                          className="px-2.5 py-1 text-muted transition-colors hover:text-gray-100"
                          aria-label={`Decrease ${line.name} quantity`}
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center font-mono font-semibold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(line.productId)}
                          className="px-2.5 py-1 text-muted transition-colors hover:text-gray-100"
                          aria-label={`Increase ${line.name} quantity`}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-muted">
                      {formatCurrency(line.unitPriceCents, currencySymbol)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-semibold text-gray-100">
                      {formatCurrency(line.unitPriceCents * line.quantity, currencySymbol)}
                    </td>
<td className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => removeLine(line.productId)}
                        className="rounded px-2 py-1 text-muted transition-colors hover:bg-danger-muted hover:text-danger"
                        title="Remove item"
                        aria-label={`Remove ${line.name} from cart`}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Totals + actions */}
      <div className="flex w-80 shrink-0 flex-col border-l border-edge p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Items</span>
            <span className="font-medium">{totals.totalItems}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Subtotal (incl. VAT)</span>
            <span className="font-mono">{formatCurrency(totals.grandTotalCents, currencySymbol)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">of which VAT ({vatRatePercent}%)</span>
            <span className="font-mono text-muted">
              {formatCurrency(vatCents, currencySymbol)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-edge pt-3">
          <span className="text-base font-semibold">Grand Total</span>
          <span className="text-2xl font-bold text-accent">
            {formatCurrency(totals.grandTotalCents, currencySymbol)}
          </span>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <Button variant="secondary" onClick={clear} disabled={isEmpty}>
            Clear cart
          </Button>
          <Button
            variant="secondary"
            disabled={isEmpty}
            onClick={() => setVoidTarget({ kind: 'sale' })}
            title="Void the entire sale (requires manager PIN)"
          >
            Void sale
          </Button>
          <Button
            variant="secondary"
            disabled={!selectedLine}
            onClick={() => selectedLine && setVoidTarget({ kind: 'item', line: selectedLine })}
            title={
              selectedLine
                ? `Void "${selectedLine.name}" (requires manager PIN)`
                : 'Click a cart line first, then void it (requires manager PIN)'
            }
          >
            Void item
          </Button>
          <Button size="lg" disabled={isEmpty} onClick={() => setCheckoutOpen(true)}>
            Checkout
          </Button>
        </div>
      </div>

      {checkoutOpen && (
        <CheckoutModal
          currencySymbol={currencySymbol}
          onClose={() => setCheckoutOpen(false)}
          onCompleted={() => {
            clear();
            setSelectedLineId(null);
          }}
        />
      )}

      {voidTarget && (
        <VoidModal
          title={voidTarget.kind === 'item' ? 'Void item' : 'Void entire sale'}
          lines={
            voidTarget.kind === 'item'
              ? [
                  {
                    label: `${voidTarget.line.quantity} × ${voidTarget.line.name}`,
                    amountCents: voidTarget.line.quantity * voidTarget.line.unitPriceCents
                  }
                ]
              : lines.map((line) => ({
                  label: `${line.quantity} × ${line.name}`,
                  amountCents: line.quantity * line.unitPriceCents
                }))
          }
          totalCents={
            voidTarget.kind === 'item'
              ? voidTarget.line.quantity * voidTarget.line.unitPriceCents
              : totals.grandTotalCents
          }
          currencySymbol={currencySymbol}
          confirmLabel={voidTarget.kind === 'item' ? 'Void item' : 'Void sale'}
          onConfirm={handleVoidConfirm}
          onClose={() => setVoidTarget(null)}
        />
      )}
    </section>
  );
}
