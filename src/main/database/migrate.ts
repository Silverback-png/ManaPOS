import { getDatabase } from './connection';
import { MIGRATIONS } from './schema';

/**
 * Versioned migration runner.
 *
 * Each migration runs inside a transaction, so a failed migration can never
 * leave the schema half-applied. Applied versions are recorded in
 * schema_migrations, making every run after the first a no-op.
 *
 * Foreign-key enforcement is suspended for the migration run and re-enabled
 * afterwards: table-rebuild migrations (e.g. v2, which rebuilds
 * business_days) DROP a parent table that child rows still reference, and
 * with enforcement ON that DROP performs an implicit DELETE which violates
 * the child FKs. This is the procedure SQLite documents for such rebuilds —
 * the pragma is a no-op inside a transaction, so it must wrap the loop.
 * A foreign_key_check afterwards proves the rebuild left data consistent.
 */
export function runMigrations(): void {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at TEXT    NOT NULL
    );
  `);

  const appliedRows = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as Array<{ version: number }>;
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  const recordMigration = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
  );

  db.pragma('foreign_keys = OFF');
  try {
    for (const migration of MIGRATIONS) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      const applyMigration = db.transaction(() => {
        db.exec(migration.sql);
        recordMigration.run(migration.version, migration.name, new Date().toISOString());
      });

      applyMigration();
    }
  } finally {
    db.pragma('foreign_keys = ON');
  }

  const violations = db.pragma('foreign_key_check') as unknown[];
  if (violations.length > 0) {
    throw new Error(
      `foreign_key_check failed after migrations: ${violations.length} violation(s)`
    );
  }
}


