import * as path from 'path';
import { getDatabase } from '../database';
import { getAppPaths } from '../utils/paths';

/**
 * Creates a consistent backup of the live database using SQLite's online
 * backup API — safe while the app is running, unlike a raw file copy.
 * Called automatically at every End of Day.
 */
export async function createDatabaseBackup(businessDate: string): Promise<string> {
  const { backupsDir } = getAppPaths();
  const fileName = `manapos_${businessDate}_${fileSafeTimepart()}.db`;
  const filePath = path.join(backupsDir, fileName);

  await getDatabase().backup(filePath);
  return filePath;
}

/** HHmmss from the Windows system clock, e.g. "105500" — keeps filenames unique. */
function fileSafeTimepart(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
