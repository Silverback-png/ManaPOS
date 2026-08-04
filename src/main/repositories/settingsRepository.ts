import { getDatabase } from '../database';

/**
 * Data access for the settings table (simple key/value store).
 * The service layer maps these rows to the typed AppSettings model —
 * the rest of the app never sees raw keys.
 */
export function getAllSettings(): Record<string, string> {
  const db = getDatabase();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
    key: string;
    value: string;
  }>;

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.key] = row.value;
  }
  return map;
}

/** Writes several settings atomically — either all persist or none do. */
export function setSettings(entries: ReadonlyArray<readonly [string, string]>): void {
  const db = getDatabase();
  const statement = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const writeAll = db.transaction(() => {
    for (const [key, value] of entries) {
      statement.run(key, value);
    }
  });

  writeAll();
}
