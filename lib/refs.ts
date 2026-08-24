/**
 * Unique reference generation for AuthePay transactions.
 *
 * References are 128-bit, URL-safe, unambiguous, and uppercase.
 * Implemented as a pure function so it can be tested without I/O.
 */

import { randomBytes } from "node:crypto";

export type ReferencePrefix = "ap_txn" | "ap_pay" | "ap_ref" | "ap_key";

export interface RandomSource {
  (size: number): Buffer;
}

const defaultRandom: RandomSource = (size) => randomBytes(size);

/**
 * Generate a new reference with the provided/random entropy.
 * Entropy of exactly 16 bytes yields a 26-char alphanumeric suffix.
 */
export function createReference(
  prefix: ReferencePrefix,
  random: RandomSource = defaultRandom
): string {
  return prefix.toUpperCase() + "_" + encodeBase32Url(random(16));
}

/** RFC4648 base32 with URL-safe alphabet (no padding, no "+/"). */
export function encodeBase32Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += alphabet[parseInt(bits.slice(i, i + 5), 2) as number];
  }
  return out;
}