import Database from 'better-sqlite3';
import { getAppPaths } from '../utils/paths';

/**
 * The single database connection for the whole application.
 *
 * better-sqlite3 is synchronous, which is exactly right for a single-user
 * desktop POS: every write is atomic, there is no connection pool to manage,
 * and the main process can never interleave two half-finished sales.
 *
 * Pragmas:
 *  - WAL mode        → crash-safe, readers never block the writer
 *  - foreign_keys ON → the schema's referential rules are actually enforced
 *  - busy_timeout    → wait instead of failing if the file is briefly locked
 */
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const { databaseFile } = getAppPaths();
  db = new Database(databaseFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Runs `fn` inside a single atomic transaction on the shared connection.
 * Services use this when one logical operation must write several rows
 * (e.g. a void AND its audit entry) — either everything persists, or
 * nothing does.
 */
export function runInTransaction<T>(fn: () => T): T {
  return getDatabase().transaction(fn)();
}
