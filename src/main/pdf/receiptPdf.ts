import * as path from 'path';
import { PaymentType } from '../../shared/types/domain';
import { getAppPaths } from '../utils/paths';
import { formatPdfMoney, writePdf } from './pdfService';

/**
 * Receipt PDF — 80mm thermal-style layout, saved per receipt number into
 * Documents/POS Reports/Sales/. Printing arrives in Version 2; these PDFs
 * are the permanent sale archive.
 */
export interface ReceiptPdfData {
  businessName: string;
  businessAddress: string;
  phoneNumber: string;
  receiptNumber: number;
  createdAt: string;
  paymentType: PaymentType;
  lines: Array<{
    productName: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  vatRatePercent: number;
  vatTotalCents: number;
  totalCents: number;
  footer: string;
  currencySymbol: string;
}

const PAGE_WIDTH = 226; // ≈ 80mm in points
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const DIVIDER = '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -';

const PAYMENT_LABELS: Record<PaymentType, string> = {
  cash: 'CASH',
  card: 'CARD',
  mixed: 'MIXED'
};

export async function generateReceiptPdf(data: ReceiptPdfData): Promise<string> {
  const { salesReportsDir } = getAppPaths();
  const fileName = `Receipt-${String(data.receiptNumber).padStart(6, '0')}.pdf`;
  const filePath = path.join(salesReportsDir, fileName);

  // Receipts vary in length — the page height is sized to the content.
  const pageHeight =
    240 +
    data.lines.length * 24 +
    (data.businessAddress ? 12 : 0) +
    (data.phoneNumber ? 12 : 0) +
    (data.footer ? 20 : 0);

  await writePdf(filePath, PAGE_WIDTH, pageHeight, (doc) => {
    let y = 18;

    const divider = (): void => {
      y += 4;
      doc
        .font('Helvetica')
        .fontSize(6)
        .fillColor('#000000')
        .text(DIVIDER, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 12;
    };

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(data.businessName, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
    y += 16;
    if (data.businessAddress) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .text(data.businessAddress, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 10;
    }
    if (data.phoneNumber) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .text(`Tel: ${data.phoneNumber}`, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 10;
    }
    divider();

    // Receipt meta
    doc.font('Helvetica').fontSize(8);
    doc.text(`Receipt No: ${String(data.receiptNumber).padStart(6, '0')}`, MARGIN, y, {
      width: CONTENT_WIDTH
    });
    y += 11;
    doc.text(
      `Date: ${data.createdAt.slice(0, 10)}  Time: ${data.createdAt.slice(11, 19)}`,
      MARGIN,
      y,
      { width: CONTENT_WIDTH }
    );
    divider();

    // Line items
    for (const line of data.lines) {
      doc.font('Helvetica').fontSize(7).text(line.productName, MARGIN, y, {
        width: CONTENT_WIDTH
      });
      y += 10;
      doc.text(
        `${line.quantity} x ${formatPdfMoney(line.unitPriceCents, data.currencySymbol)}`,
        MARGIN + 8,
        y,
        { width: CONTENT_WIDTH - 8 }
      );
      doc.text(formatPdfMoney(line.lineTotalCents, data.currencySymbol), MARGIN, y, {
        width: CONTENT_WIDTH,
        align: 'right'
      });
      y += 14;
    }
    divider();

    // Totals
    doc.font('Helvetica-Bold').fontSize(10).text('TOTAL', MARGIN, y, { width: CONTENT_WIDTH });
    doc.text(formatPdfMoney(data.totalCents, data.currencySymbol), MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'right'
    });
    y += 15;
    doc.font('Helvetica').fontSize(7);
    doc.text(`VAT (${data.vatRatePercent}% included)`, MARGIN, y, { width: CONTENT_WIDTH });
    doc.text(formatPdfMoney(data.vatTotalCents, data.currencySymbol), MARGIN, y, {
      width: CONTENT_WIDTH,
      align: 'right'
    });
    y += 12;
    doc.text(`Payment: ${PAYMENT_LABELS[data.paymentType]}`, MARGIN, y, {
      width: CONTENT_WIDTH
    });
    divider();

    // Footer
    if (data.footer) {
      doc
        .font('Helvetica')
        .fontSize(7)
        .text(data.footer, MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
      y += 12;
    }
    y += 6;
    doc
      .font('Helvetica')
      .fontSize(6)
      .fillColor('#777777')
      .text('Powered by ManaPOS', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });
  });

  return filePath;
}
