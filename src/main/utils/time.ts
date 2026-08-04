/**
 * The application uses the Windows system clock exclusively — there is
 * deliberately no separate "POS clock". Every timestamp in the database
 * comes from these helpers so the format stays consistent.
 */

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** 'YYYY-MM-DD' in the system timezone — the business date key used everywhere. */
export function currentBusinessDate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Local ISO-8601 timestamp WITH offset, e.g. 2026-07-31T08:05:00.000+02:00
 * Unambiguous for audits, and sorts correctly as plain text.
 */
export function currentTimestamp(now: Date = new Date()): string {
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
    `.${pad(now.getMilliseconds(), 3)}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}
