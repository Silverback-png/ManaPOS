import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  BACKUPS_FOLDER,
  DATABASE_FILE_NAME,
  EOD_REPORTS_FOLDER,
  REPORTS_ROOT_FOLDER,
  SALES_REPORTS_FOLDER
} from '../../shared/constants';

/**
 * Single source of truth for every file-system location the app uses.
 *
 *  - Database lives in the OS user-data folder (roaming profile, writable).
 *  - Business documents (receipts, reports, backups) live under
 *    Documents/POS Reports so they survive uninstalls and are easy to find.
 */
export interface AppPaths {
  userDataDir: string;
  databaseFile: string;
  reportsRoot: string;
  salesReportsDir: string;
  endOfDayReportsDir: string;
  backupsDir: string;
}

let cachedPaths: AppPaths | null = null;

export function getAppPaths(): AppPaths {
  if (cachedPaths) {
    return cachedPaths;
  }

  const userDataDir = app.getPath('userData');
  const reportsRoot = path.join(app.getPath('documents'), REPORTS_ROOT_FOLDER);

  cachedPaths = {
    userDataDir,
    databaseFile: path.join(userDataDir, DATABASE_FILE_NAME),
    reportsRoot,
    salesReportsDir: path.join(reportsRoot, SALES_REPORTS_FOLDER),
    endOfDayReportsDir: path.join(reportsRoot, EOD_REPORTS_FOLDER),
    backupsDir: path.join(reportsRoot, BACKUPS_FOLDER)
  };

  return cachedPaths;
}

/** Creates every directory the app needs. Idempotent — safe on every launch. */
export function ensureAppDirectories(): AppPaths {
  const paths = getAppPaths();
  fs.mkdirSync(paths.userDataDir, { recursive: true });
  fs.mkdirSync(paths.salesReportsDir, { recursive: true });
  fs.mkdirSync(paths.endOfDayReportsDir, { recursive: true });
  fs.mkdirSync(paths.backupsDir, { recursive: true });
  return paths;
}
