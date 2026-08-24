/**
 * Immutable, exact money math.
 *
 * All balances/amounts are stored as integer *minor units* (e.g. thebe / cents).
 * This module deliberately contains no I/O so it can be unit tested anywhere.
 */

import { MoneyError } from "./errors.ts";

export const CURRENCIES = ["BWP", "USD", "ZAR"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "BWP";

/** Minor units per major unit for supported currencies. */
export const MINOR_UNITS: Record<Currency, number> = {
  BWP: 2,
  USD: 2,
  ZAR: 2,
};

/** Parse and validate a positive decimal amount into minor units. */
export function toMinorUnits(
  amount: string | number,
  currency: Currency = DEFAULT_CURRENCY
): number {
  const decimals = MINOR_UNITS[currency] ?? 2;
  const raw = typeof amount === "number" ? amount.toString() : amount.trim();
  if (!/^(0|[1-9]\d{0,9})(\.\d+)?$/.test(raw)) {
    throw new MoneyError(`Invalid amount: '${raw}'`);
  }
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > decimals) {
    throw new MoneyError(
      `'${raw}' has more than ${decimals} decimal places for ${currency}`
    );
  }
  const paddedFrac = frac.padEnd(decimals, "0");
  const safeWhole = Number(whole);
  const safeFrac = Number(paddedFrac === "" ? "0" : paddedFrac);
  const result = safeWhole * 10 ** decimals + safeFrac;
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError(`Amount out of range: '${raw}'`);
  }
  return result;
}

/** Format minor units as a decimal string (no currency symbol). */
export function fromMinor(minor: number, currency: Currency = DEFAULT_CURRENCY): string {
  const decimals = MINOR_UNITS[currency] ?? 2;
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const major = Math.trunc(abs / 10 ** decimals);
  const frac = abs % 10 ** decimals;
  return `${sign}${major}.${frac.toString().padStart(decimals, "0")}`;
}