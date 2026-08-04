import { ensureAppDirectories } from '../utils/paths';
import { closeDatabase, getDatabase, runInTransaction } from './connection';
import { runMigrations } from './migrate';
import { seedIfNeeded } from './seed';

/**
 * Database startup sequence, called once from the main process before the
 * window is created. Order matters:
 *   1. Directories must exist before the database file can be created.
 *   2. The connection must exist before migrations can run.
 *   3. The schema must exist before seed data can be written.
 */
export function initializeDatabase(): void {
  ensureAppDirectories();
  getDatabase();
  runMigrations();
  seedIfNeeded();
}

export { closeDatabase, getDatabase, runInTransaction };
