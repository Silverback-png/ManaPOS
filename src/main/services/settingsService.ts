import { DEFAULTS, MANAGER_PIN_LENGTH } from '../../shared/constants';
import { AppSettings, UpdateSettingsInput } from '../../shared/types/domain';
import * as settingsRepository from '../repositories/settingsRepository';
import * as auditService from './auditService';

/** Maps the typed settings model to its database keys. */
const KEY_MAP = {
  businessName: 'business_name',
  businessAddress: 'business_address',
  phoneNumber: 'phone_number',
  vatRatePercent: 'vat_rate_percent',
  receiptFooter: 'receipt_footer',
  managerPin: 'manager_pin',
  currencySymbol: 'currency_symbol'
} as const;

type SettingField = keyof typeof KEY_MAP;

export function getSettings(): AppSettings {
  const rows = settingsRepository.getAllSettings();
  return {
    businessName: rows.business_name ?? DEFAULTS.BUSINESS_NAME,
    businessAddress: rows.business_address ?? '',
    phoneNumber: rows.phone_number ?? '',
    vatRatePercent: parseNumber(rows.vat_rate_percent, DEFAULTS.VAT_RATE_PERCENT),
    receiptFooter: rows.receipt_footer ?? DEFAULTS.RECEIPT_FOOTER,
    managerPin: rows.manager_pin ?? DEFAULTS.MANAGER_PIN,
    currencySymbol: rows.currency_symbol ?? DEFAULTS.CURRENCY_SYMBOL
  };
}

/**
 * Validates, normalises and persists settings, then writes an audit entry
 * describing exactly what changed. Only changed keys are written.
 * The manager PIN is masked in the audit trail.
 */
export function updateSettings(input: UpdateSettingsInput): AppSettings {
  const normalized = normalize(input);
  validate(normalized);

  const current = getSettings();
  const changedEntries: Array<readonly [string, string]> = [];
  const auditChanges: Array<{ key: string; from: string; to: string }> = [];

  for (const field of Object.keys(KEY_MAP) as SettingField[]) {
    const oldValue = current[field];
    const newValue = normalized[field];
    if (newValue === oldValue) {
      continue;
    }

    changedEntries.push([KEY_MAP[field], String(newValue)]);
    auditChanges.push({
      key: KEY_MAP[field],
      from: field === 'managerPin' ? '••••' : String(oldValue),
      to: field === 'managerPin' ? '••••' : String(newValue)
    });
  }

  if (changedEntries.length === 0) {
    return current;
  }

  settingsRepository.setSettings(changedEntries);
  auditService.log('settings_change', 'settings', null, { changes: auditChanges });

  return getSettings();
}

function normalize(input: UpdateSettingsInput): UpdateSettingsInput {
  return {
    ...input,
    businessName: input.businessName.trim(),
    businessAddress: input.businessAddress.trim(),
    phoneNumber: input.phoneNumber.trim(),
    receiptFooter: input.receiptFooter.trim(),
    currencySymbol: input.currencySymbol.trim()
  };
}

function validate(input: UpdateSettingsInput): void {
  if (input.businessName.length === 0) {
    throw new Error('Business name is required.');
  }
  if (input.businessName.length > 100) {
    throw new Error('Business name is too long (max 100 characters).');
  }
  if (
    !Number.isFinite(input.vatRatePercent) ||
    input.vatRatePercent < 0 ||
    input.vatRatePercent > 100
  ) {
    throw new Error('VAT % must be a number between 0 and 100.');
  }
  if (!new RegExp(`^\\d{${MANAGER_PIN_LENGTH}}$`).test(input.managerPin)) {
    throw new Error(`Manager PIN must be exactly ${MANAGER_PIN_LENGTH} digits.`);
  }
  if (input.currencySymbol.length === 0 || input.currencySymbol.length > 3) {
    throw new Error('Currency symbol is required (max 3 characters).');
  }
  if (input.businessAddress.length > 200) {
    throw new Error('Business address is too long (max 200 characters).');
  }
  if (input.phoneNumber.length > 30) {
    throw new Error('Phone number is too long (max 30 characters).');
  }
  if (input.receiptFooter.length > 200) {
    throw new Error('Receipt footer is too long (max 200 characters).');
  }
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
