/**
 * Webhook signature verification (pure, unit-tested).
 *
 * Signatures use HMAC-SHA256 over the raw body with a shared per-endpoint
 * secret. Format: `sha256=<hex>`. Comparison is constant-time.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-authepay-signature";
export const SIGNATURE_PREFIX = "sha256=";

export function computeSignature(secret: string, rawBody: string): string {
  return SIGNATURE_PREFIX + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/** Verify a provided signature against an expected one; constant-time. */
export function verifySignature(
  secret: string,
  rawBody: string,
  providedSignature: string | null
): boolean {
  if (!providedSignature) return false;
  const expected = computeSignature(secret, rawBody);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(providedSignature.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Extract the signature from headers (case-insensitive lookup helper). */
export function signatureFromHeaders(
  getHeader: (name: string) => string | null | undefined
): string | null {
  return getHeader(SIGNATURE_HEADER) ?? null;
}

/**
 * Replay protection window for timestamped events (in seconds).
 * Providers should include `timestamp` in the payload; events older than this
 * are rejected as replays.
 */
export const MAX_EVENT_AGE_SECONDS = 300;

export function isWithinReplayWindow(
  eventTimestampSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const delta = Math.abs(nowSeconds - eventTimestampSeconds);
  return delta <= MAX_EVENT_AGE_SECONDS;
}