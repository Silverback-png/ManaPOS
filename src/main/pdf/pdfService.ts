import PDFDocument from 'pdfkit';
import * as fs from 'fs';

/** The concrete PDFKit document type, shared by all PDF layouts. */
export type PdfDoc = InstanceType<typeof PDFDocument>;

/** Money formatting for PDF documents (integer cents → "R 12.00"). */
export function formatPdfMoney(cents: number, currencySymbol: string): string {
  return `${currencySymbol} ${(cents / 100).toFixed(2)}`;
}

/**
 * Writes a PDF to disk. The `render` callback draws synchronously; the
 * returned promise resolves only when the file is fully flushed — callers
 * can safely report the path to the user afterwards.
 */
export function writePdf(
  filePath: string,
  widthPoints: number,
  heightPoints: number,
  render: (doc: PdfDoc) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [widthPoints, heightPoints],
      margins: { top: 0, left: 0, bottom: 0, right: 0 },
      autoFirstPage: true
    });

    const stream = fs.createWriteStream(filePath);
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    try {
      render(doc);
      doc.end();
    } catch (error) {
      stream.destroy();
      reject(error);
    }
  });
}
