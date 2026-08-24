/**
 * Idempotency-key handling.
 *
 * Clients can send an `Idempotency-Key` header on payment/transfer requests so
 * retries do not create duplicate transactions. Uniqueness is enforced in the
 * database with a unique constraint on `transactions.idempotency_key`, and the
 * payment pipeline reuses the original transaction when the key is replayed.
 *
 * The validation logic here is pure and unit-tested.
 */

import { badRequest } from "./errors.ts";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;

/** Validate a raw idempotency key value; returns the normalized key. */
export function validateIdempotencyKey(raw: string | null): string | null {
  if (raw === null || raw === "") return null;
  const key = raw.trim();
  if (key.length < 8 || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw badRequest(
      `Idempotency key must be between 8 and ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`
    );
  }
  if (!IDEMPOTENCY_KEY_PATTERN.test(key)) {
    throw badRequest(
      "Idempotency key may only contain letters, digits, '-', '_' and '.'"
    );
  }
  return key;
}

/** Read and validate the idempotency key from a request-like headers map. */
export function idempotencyKeyFromHeaders(
  getHeader: (name: string) => string | null
): string | null {
  return validateIdempotencyKey(getHeader(IDEMPOTENCY_KEY_HEADER));
}