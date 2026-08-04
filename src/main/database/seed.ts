import { DEFAULTS } from '../../shared/constants';
import { currentBusinessDate, currentTimestamp } from '../utils/time';
import { getDatabase } from './connection';

/**
 * First-launch seed. Every statement is idempotent (INSERT OR IGNORE /
 * existence checks), so this runs safely on every startup:
 *
 *  - Default settings are written only if the key does not exist yet
 *    (user edits are never overwritten).
 *  - If no business day is open (brand-new database, or the previous day
 *    was closed), a business day is opened for today's system date.
 */
const DEFAULT_SETTINGS: ReadonlyArray<readonly [string, string]> = [
  ['business_name', DEFAULTS.BUSINESS_NAME],
  ['business_address', ''],
  ['phone_number', ''],
  ['vat_rate_percent', String(DEFAULTS.VAT_RATE_PERCENT)],
  ['receipt_footer', DEFAULTS.RECEIPT_FOOTER],
  ['manager_pin', DEFAULTS.MANAGER_PIN],
  ['currency_symbol', DEFAULTS.CURRENCY_SYMBOL]
];

export function seedIfNeeded(): void {
  const db = getDatabase();

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of DEFAULT_SETTINGS) {
    insertSetting.run(key, value);
  }

  const openDay = db
    .prepare("SELECT id FROM business_days WHERE status = 'open' LIMIT 1")
    .get();

  if (!openDay) {
    db.prepare(
      "INSERT OR IGNORE INTO business_days (business_date, status, opened_at) VALUES (?, 'open', ?)"
    ).run(currentBusinessDate(), currentTimestamp());
  }
}
