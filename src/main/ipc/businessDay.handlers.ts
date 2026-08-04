import { BusinessDay, EndOfDayResult } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as businessDayService from '../services/businessDayService';
import { handleQuery } from './handle';

export function registerBusinessDayHandlers(): void {
  handleQuery<BusinessDay>(IpcChannels.businessDay.getCurrent, () =>
    businessDayService.getCurrentBusinessDay()
  );

  handleQuery<EndOfDayResult>(IpcChannels.businessDay.performEndOfDay, () =>
    businessDayService.performEndOfDay()
  );
}
