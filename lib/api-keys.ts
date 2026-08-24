/**
 * API key lifecycle (server-side only).
 *
 * Keys are generated as `apk_<raw>` where `<raw>` is 256 bits of entropy.
 * Only the SHA-256 hash of a key is persisted; the plaintext key is shown to
 * the owner exactly once at creation time. The raw key itself is never stored.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { badRequest, unauthorized } from "./errors.ts";

export const API_KEY_PREFIX = "apk_";
export const API_KEY_BYTES = 32;
export const API_KEY_HASH_ALGO = "sha256";

export interface RandomSource {
  (size: number): Buffer;
}

const defaultRandom: RandomSource = (size) => randomBytes(size);

/** Generate a new raw API key. */
export function generateApiKey(random: RandomSource = defaultRandom): string {
  return API_KEY_PREFIX + random(API_KEY_BYTES).toString("base64url");
}

/** Stable SHA-256 hex digest of an API key (used for lookup). */
export function hashApiKey(rawKey: string): string {
  return createHash(API_KEY_HASH_ALGO).update(rawKey, "utf8").digest("hex");
}

/** Short, safe display fragment of a key (never the full secret). */
export function keyPrefix(rawKey: string): string {
  return rawKey.slice(0, 10) + "…";
}

/** Validate the shape of an API key value. */
export function isWellFormedApiKey(value: string): boolean {
  return /^apk_[A-Za-z0-9_-]{40,}$/.test(value);
}

/** Extract a bearer token from an Authorization header value, if present. */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const lower = authHeader.toLowerCase();
  if (!lower.startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

/** Normalize a raw API key: validate it and require the `apk_` prefix. */
export function normalizeApiKey(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (!trimmed.startsWith(API_KEY_PREFIX)) {
    throw badRequest("API key must start with the '" + API_KEY_PREFIX + "' prefix");
  }
  if (!isWellFormedApiKey(trimmed)) {
    throw badRequest("Malformed API key");
  }
  return trimmed;
}

/** Authorize a presented raw key against a stored hash with a constant-time compare. */
export function verifyApiKey(presentedNormalized: string, storedHash: string): boolean {
  const presentedHash = Buffer.from(hashApiKey(presentedNormalized), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (presentedHash.length !== expected.length) return false;
  return timingSafeEqual(presentedHash, expected);
}

/** Build an ASCII map of scope names to human labels (used in admin UI). */
export const API_KEY_SCOPES = ["payments:write", "payments:read", "webhooks:read"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function assertScope(scopes: readonly string[], required: ApiKeyScope): void {
  if (!scopes.includes(required)) {
    throw unauthorized("API key does not have scope: " + required);
  }
}