import { BusinessDay, EndOfDayReport } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as businessDayService from '../services/businessDayService';
import * as reportService from '../services/reportService';
import { handle, handleQuery } from './handle';

export function registerReportHandlers(): void {
  handleQuery<BusinessDay[]>(IpcChannels.reports.listBusinessDays, () =>
    businessDayService.listBusinessDays()
  );

  handle<{ businessDayId: number }, EndOfDayReport>(
    IpcChannels.reports.getEndOfDayReport,
    (input) => reportService.getReportForBusinessDay(input.businessDayId)
  );
}
