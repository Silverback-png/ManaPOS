import { extractVatCents } from '../../shared/money';
import { CompleteSaleInput, CompletedSale, PaymentType } from '../../shared/types/domain';
import * as businessDayRepository from '../repositories/businessDayRepository';
import * as productRepository from '../repositories/productRepository';
import * as saleRepository from '../repositories/saleRepository';
import { SaleItemWriteData } from '../repositories/saleRepository';
import { generateReceiptPdf } from '../pdf/receiptPdf';
import { currentTimestamp } from '../utils/time';
import * as settingsService from './settingsService';

const VALID_PAYMENT_TYPES: readonly PaymentType[] = ['cash', 'card', 'mixed'];

/**
 * Completes a sale.
 *
 * Trust boundaries, in order:
 *  1. The cart's display prices are NEVER trusted — every price, cost and
 *     VAT rate is re-read from the database at this exact moment.
 *  2. Each sale_item stores a full SNAPSHOT (name, prices, VAT rate), so
 *     future product edits can never rewrite history.
 *  3. Sale + items persist in ONE transaction.
 *  4. Only after the database commit does the receipt PDF get generated.
 */
export async function completeSale(input: CompleteSaleInput): Promise<CompletedSale> {
  validate(input);

  const businessDay = businessDayRepository.getOpenBusinessDay();
  if (!businessDay) {
    throw new Error('No open business day. Please restart the application.');
  }

  const settings = settingsService.getSettings();
  const mergedLines = mergeDuplicateLines(input.lines);

  const itemData: SaleItemWriteData[] = mergedLines.map((line) => {
    const product = productRepository.getProductById(line.productId);
    if (!product) {
      throw new Error('A product in this sale no longer exists. Clear the cart and try again.');
    }
    if (!product.isActive) {
      throw new Error(`"${product.name}" is no longer active. Remove it from the cart.`);
    }

    const lineTotalCents = product.sellingPriceCents * line.quantity;
    return {
      productId: product.id,
      productName: product.name,
      quantity: line.quantity,
      unitPriceCents: product.sellingPriceCents,
      costPriceCents: product.costPriceCents,
      vatRatePercent: settings.vatRatePercent,
      vatAmountCents: extractVatCents(lineTotalCents, settings.vatRatePercent),
      lineTotalCents
    };
  });

  const subtotalCents = itemData.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const vatTotalCents = itemData.reduce((sum, item) => sum + item.vatAmountCents, 0);
  const costTotalCents = itemData.reduce(
    (sum, item) => sum + item.costPriceCents * item.quantity,
    0
  );

  const sale = saleRepository.createSaleWithItems(
    {
      businessDayId: businessDay.id,
      paymentType: input.paymentType,
      subtotalCents,
      vatTotalCents,
      totalCents: subtotalCents, // VAT-inclusive pricing: total == subtotal
      costTotalCents,
      createdAt: currentTimestamp()
    },
    itemData
  );

  const items = saleRepository.listSaleItems(sale.id);

  const receiptPdfPath = await generateReceiptPdf({
    businessName: settings.businessName,
    businessAddress: settings.businessAddress,
    phoneNumber: settings.phoneNumber,
    receiptNumber: sale.receiptNumber,
    createdAt: sale.createdAt,
    paymentType: sale.paymentType,
    lines: items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents
    })),
    vatRatePercent: settings.vatRatePercent,
    vatTotalCents: sale.vatTotalCents,
    totalCents: sale.totalCents,
    footer: settings.receiptFooter,
    currencySymbol: settings.currencySymbol
  });

  return { sale, items, receiptPdfPath };
}

function validate(input: CompleteSaleInput): void {
  if (!VALID_PAYMENT_TYPES.includes(input.paymentType)) {
    throw new Error('Invalid payment type.');
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error('The cart is empty.');
  }
  for (const line of input.lines) {
    if (!Number.isInteger(line.productId)) {
      throw new Error('Invalid product in cart.');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 9999) {
      throw new Error('Invalid quantity in cart.');
    }
  }
}

/** Defensive merge — identical product ids become one line with summed qty. */
function mergeDuplicateLines(
  lines: CompleteSaleInput['lines']
): CompleteSaleInput['lines'] {
  const quantities = new Map<number, number>();
  for (const line of lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}
