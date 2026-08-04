/**
 * Application-wide constants shared between the main process and the renderer.
 *
 * This file must stay free of Node.js, Electron and DOM APIs — it is imported
 * by every process in the app.
 */

export const APP_NAME = 'ManaPOS';

/** Directory names created under the user's Documents folder. */
export const REPORTS_ROOT_FOLDER = 'POS Reports';
export const SALES_REPORTS_FOLDER = 'Sales';
export const EOD_REPORTS_FOLDER = 'End Of Day';
export const BACKUPS_FOLDER = 'Backups';

export const DATABASE_FILE_NAME = 'manapos.db';

/** Business defaults written to the Settings table on first launch. */
export const DEFAULTS = {
  BUSINESS_NAME: 'My Business',
  VAT_RATE_PERCENT: 15,
  CURRENCY_SYMBOL: 'R',
  RECEIPT_FOOTER: 'Thank you for your business!',
  MANAGER_PIN: '1234'
} as const;

export const MANAGER_PIN_LENGTH = 4;
