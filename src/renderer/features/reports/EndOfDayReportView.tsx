import type { EndOfDayReport } from '@shared/types/domain';
import { formatCurrency } from '../../lib/format';

interface EndOfDayReportViewProps {
  report: EndOfDayReport;
  currencySymbol: string;
}

/** Read-only metric grid + top sellers, shared by the EOD success dialog
 *  and the historical "view report" dialog. */
export function EndOfDayReportView({
  report,
  currencySymbol
}: EndOfDayReportViewProps): JSX.Element {
  const money = (cents: number): string => formatCurrency(cents, currencySymbol);

  const metrics: Array<{ label: string; value: string; emphasize?: boolean }> = [
    { label: 'Gross Sales', value: money(report.grossSalesCents) },
    { label: 'Cost of Goods Sold', value: money(report.costOfGoodsSoldCents) },
    { label: 'Gross Profit', value: money(report.grossProfitCents), emphasize: true },
    { label: 'VAT (included)', value: money(report.vatTotalCents) },
    { label: 'Transactions', value: String(report.transactionCount) },
    { label: 'Average Sale', value: money(report.averageSaleCents) },
    { label: `Voids (${report.voidCount})`, value: money(report.voidTotalCents) }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg bg-base px-3.5 py-2.5">
            <p className="text-xs text-muted">{metric.label}</p>
            <p
              className={
                'mt-0.5 font-mono text-sm font-semibold ' +
                (metric.emphasize ? 'text-accent' : 'text-gray-100')
              }
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          Top selling products
        </p>
        {report.topProducts.length === 0 ? (
          <p className="text-sm text-muted">No sales recorded for this business day.</p>
        ) : (
          <div className="space-y-1">
            {report.topProducts.map((product, index) => (
              <div key={product.productName} className="flex justify-between gap-3 text-sm">
                <span className="truncate text-gray-200">
                  {index + 1}. {product.productName}
                </span>
                <span className="shrink-0 font-mono text-muted">
                  {product.quantitySold} × {money(product.grossCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
