import { BusinessDay, EndOfDayReport, TopSellingProduct } from '../../shared/types/domain';
import * as businessDayRepository from '../repositories/businessDayRepository';
import * as saleRepository from '../repositories/saleRepository';
import * as voidRepository from '../repositories/voidRepository';

const TOP_PRODUCT_COUNT = 5;

/**
 * End of Day calculations.
 *
 * Every figure comes from the SNAPSHOT data (sale_items / sales rows frozen
 * at sale time), so this report can be regenerated years from now — after
 * any number of price edits — and will produce exactly the same numbers.
 *
 *   Gross Sales    = Σ total_cents        (total selling prices)
 *   COGS           = Σ cost_total_cents   (total cost prices)
 *   Gross Profit   = Gross Sales − COGS
 */
export function buildEndOfDayReport(businessDay: BusinessDay): EndOfDayReport {
  const sales = saleRepository.listCompletedSalesByBusinessDay(businessDay.id);
  const voids = voidRepository.listVoidsByBusinessDay(businessDay.id);

  const grossSalesCents = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const costOfGoodsSoldCents = sales.reduce((sum, sale) => sum + sale.costTotalCents, 0);
  const vatTotalCents = sales.reduce((sum, sale) => sum + sale.vatTotalCents, 0);
  const transactionCount = sales.length;

  // Top sellers aggregated from the frozen sale_items snapshots.
  const productTotals = new Map<string, { quantitySold: number; grossCents: number }>();
  for (const sale of sales) {
    for (const item of saleRepository.listSaleItems(sale.id)) {
      const existing = productTotals.get(item.productName) ?? { quantitySold: 0, grossCents: 0 };
      existing.quantitySold += item.quantity;
      existing.grossCents += item.lineTotalCents;
      productTotals.set(item.productName, existing);
    }
  }

  const topProducts: TopSellingProduct[] = [...productTotals.entries()]
    .map(([productName, totals]) => ({ productName, ...totals }))
    .sort((a, b) => b.quantitySold - a.quantitySold || b.grossCents - a.grossCents)
    .slice(0, TOP_PRODUCT_COUNT);

  return {
    businessDate: businessDay.businessDate,
    grossSalesCents,
    costOfGoodsSoldCents,
    grossProfitCents: grossSalesCents - costOfGoodsSoldCents,
    vatTotalCents,
    voidTotalCents: voids.reduce((sum, record) => sum + record.amountCents, 0),
    voidCount: voids.length,
    transactionCount,
    averageSaleCents: transactionCount > 0 ? Math.round(grossSalesCents / transactionCount) : 0,
    topProducts
  };
}

/** Rebuilds a historical report for any past business day. */
export function getReportForBusinessDay(businessDayId: number): EndOfDayReport {
  const businessDay = businessDayRepository.getBusinessDayById(businessDayId);
  if (!businessDay) {
    throw new Error('Business day not found.');
  }
  return buildEndOfDayReport(businessDay);
}
