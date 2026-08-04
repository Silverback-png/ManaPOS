import { app } from 'electron';
import { AppInfo, IpcChannels } from '../../shared/types/ipc';
import { handleQuery } from './handle';

export function registerAppHandlers(): void {
  handleQuery<AppInfo>(IpcChannels.app.getInfo, () => ({
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node ?? ''
  }));
}
