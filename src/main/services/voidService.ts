import { VoidCartItemInput, VoidCartSaleInput, VoidRecord } from '../../shared/types/domain';
import { runInTransaction } from '../database';
import * as businessDayRepository from '../repositories/businessDayRepository';
import * as voidRepository from '../repositories/voidRepository';
import * as auditService from './auditService';
import * as settingsService from './settingsService';
import { currentTimestamp } from '../utils/time';

/**
 * Voids in v1 are pre-checkout (cart) voids — no completed sale is touched.
 * Every void:
 *  1. Requires the manager PIN (verified against Settings).
 *  2. Requires a reason.
 *  3. Writes the void record AND its audit entry in ONE transaction.
 */
export function voidCartItem(input: VoidCartItemInput): VoidRecord {
  verifyManagerPin(input.managerPin);
  const reason = validateReason(input.reason);

  if (input.productName.trim().length === 0) {
    throw new Error('Invalid void item.');
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error('Invalid void quantity.');
  }
  if (!Number.isInteger(input.unitPriceCents) || input.unitPriceCents < 0) {
    throw new Error('Invalid void unit price.');
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    throw new Error('Invalid void amount.');
  }

  const businessDay = businessDayRepository.getOpenBusinessDay();
  if (!businessDay) {
    throw new Error('No open business day.');
  }

  return runInTransaction(() => {
    const record = voidRepository.insertVoid({
      businessDayId: businessDay.id,
      saleId: null,
      voidType: 'item',
      details: JSON.stringify({
        productName: input.productName,
        quantity: input.quantity,
        unitPriceCents: input.unitPriceCents
      }),
      amountCents: input.amountCents,
      reason,
      createdAt: currentTimestamp()
    });

    auditService.log('void', 'void', record.id, {
      voidType: 'item',
      productName: input.productName,
      quantity: input.quantity,
      amountCents: input.amountCents,
      reason
    });

    return record;
  });
}

export function voidCartSale(input: VoidCartSaleInput): VoidRecord {
  verifyManagerPin(input.managerPin);
  const reason = validateReason(input.reason);

  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error('The cart is empty.');
  }
  for (const line of input.lines) {
    if (line.productName.trim().length === 0 || !Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error('Invalid line in void request.');
    }
    if (!Number.isInteger(line.amountCents) || line.amountCents < 1) {
      throw new Error('Invalid line amount in void request.');
    }
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 1) {
    throw new Error('Invalid void amount.');
  }

  const businessDay = businessDayRepository.getOpenBusinessDay();
  if (!businessDay) {
    throw new Error('No open business day.');
  }

  return runInTransaction(() => {
    const record = voidRepository.insertVoid({
      businessDayId: businessDay.id,
      saleId: null,
      voidType: 'sale',
      details: JSON.stringify({ lines: input.lines }),
      amountCents: input.amountCents,
      reason,
      createdAt: currentTimestamp()
    });

    auditService.log('void', 'void', record.id, {
      voidType: 'sale',
      lineCount: input.lines.length,
      amountCents: input.amountCents,
      reason
    });

    return record;
  });
}

function verifyManagerPin(pin: string): void {
  const settings = settingsService.getSettings();
  if (typeof pin !== 'string' || pin !== settings.managerPin) {
    throw new Error('Incorrect manager PIN.');
  }
}

function validateReason(reason: string): string {
  const trimmed = reason.trim();
  if (trimmed.length < 2) {
    throw new Error('A void reason is required.');
  }
  if (trimmed.length > 200) {
    throw new Error('Void reason is too long (max 200 characters).');
  }
  return trimmed;
}
