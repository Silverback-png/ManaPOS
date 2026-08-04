/**
 * Money is stored as integer cents everywhere in the database — never floats.
 * These helpers are the ONLY place where decimal <-> cent conversion and VAT
 * extraction happen, so rounding rules stay consistent across the whole app.
 * (Shared: the renderer converts form input to cents; the main process does
 * all authoritative totals.)
 *
 * VAT model: selling prices are VAT-INCLUSIVE (SA retail standard).
 * The VAT portion is extracted, never added on top.
 */

/** Converts a decimal amount (e.g. 19.99) to integer cents. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }
  return Math.round(amount * 100);
}

/**
 * Extracts the VAT portion contained in a VAT-inclusive gross amount:
 *   vat = round(gross × rate ÷ (100 + rate))
 * All inputs/outputs are integer cents — no floating point drift.
 */
export function extractVatCents(grossCents: number, vatRatePercent: number): number {
  if (!Number.isInteger(grossCents) || grossCents < 0) {
    throw new Error(`Invalid gross cents: ${grossCents}`);
  }
  if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0) {
    throw new Error(`Invalid VAT rate: ${vatRatePercent}`);
  }
  return Math.round((grossCents * vatRatePercent) / (100 + vatRatePercent));
}

/** The net (ex-VAT) portion of a VAT-inclusive gross amount. */
export function netFromGrossCents(grossCents: number, vatRatePercent: number): number {
  return grossCents - extractVatCents(grossCents, vatRatePercent);
}
