import { AppSettings, UpdateSettingsInput } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as settingsService from '../services/settingsService';
import { handle, handleQuery } from './handle';

export function registerSettingsHandlers(): void {
  handleQuery<AppSettings>(IpcChannels.settings.get, () => settingsService.getSettings());

  handle<UpdateSettingsInput, AppSettings>(IpcChannels.settings.update, (input) =>
    settingsService.updateSettings(input)
  );
}
