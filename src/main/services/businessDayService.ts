import { BusinessDay, EndOfDayResult } from '../../shared/types/domain';
import { runInTransaction } from '../database';
import { generateEndOfDayPdf } from '../pdf/endOfDayPdf';
import * as businessDayRepository from '../repositories/businessDayRepository';
import * as auditService from './auditService';
import * as backupService from './backupService';
import * as reportService from './reportService';
import * as settingsService from './settingsService';
import { currentBusinessDate, currentTimestamp } from '../utils/time';

export function getCurrentBusinessDay(): BusinessDay {
  const businessDay = businessDayRepository.getOpenBusinessDay();
  if (!businessDay) {
    throw new Error('No open business day.');
  }
  return businessDay;
}

export function listBusinessDays(): BusinessDay[] {
  return businessDayRepository.listBusinessDays();
}

/**
 * End of Day — the trading-day boundary, in a strict order:
 *
 *  1. The report is computed from immutable snapshot data.
 *  2. Close + audit + reopen happen in ONE transaction: the database can
 *     never be left without an open business day.
 *  3. Only after the commit do file artifacts happen: the EOD PDF and the
 *     database backup. A file failure can never corrupt the day state.
 *
 * The system clock (Windows) is the only time source throughout.
 */
export async function performEndOfDay(): Promise<EndOfDayResult> {
  const businessDay = businessDayRepository.getOpenBusinessDay();
  if (!businessDay) {
    throw new Error('No open business day.');
  }

  // 1. Report from snapshot data — mathematically reproducible forever.
  const report = reportService.buildEndOfDayReport(businessDay);

  // 2. Atomic close + audit + reopen.
  const now = currentTimestamp();
  runInTransaction(() => {
    businessDayRepository.closeBusinessDay(businessDay.id, now);
    businessDayRepository.openBusinessDay(currentBusinessDate(), now);
    auditService.log('end_of_day', 'business_day', businessDay.id, {
      businessDate: businessDay.businessDate,
      grossSalesCents: report.grossSalesCents,
      costOfGoodsSoldCents: report.costOfGoodsSoldCents,
      grossProfitCents: report.grossProfitCents,
      vatTotalCents: report.vatTotalCents,
      voidTotalCents: report.voidTotalCents,
      voidCount: report.voidCount,
      transactionCount: report.transactionCount,
      averageSaleCents: report.averageSaleCents
    });
  });

  // 3. File artifacts after the commit.
  const settings = settingsService.getSettings();
  const pdfPath = await generateEndOfDayPdf({
    report,
    businessName: settings.businessName,
    currencySymbol: settings.currencySymbol,
    generatedAt: now
  });
  const backupPath = await backupService.createDatabaseBackup(businessDay.businessDate);

  return { report, pdfPath, backupPath };
}
