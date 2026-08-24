import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateApiKey,
  hashApiKey,
  keyPrefix,
  verifyApiKey,
  extractBearerToken,
  normalizeApiKey,
  isWellFormedApiKey,
} from "../lib/api-keys.ts";

test("generated keys are prefixed and unique", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.notEqual(a, b);
  assert.ok(a.startsWith("apk_"));
  assert.ok(isWellFormedApiKey(a));
});

test("hashing is stable and never returns the plaintext", () => {
  const key = generateApiKey();
  const h1 = hashApiKey(key);
  const h2 = hashApiKey(key);
  assert.equal(h1, h2);
  assert.ok(!h1.includes(key));
  assert.match(h1, /^[a-f0-9]{64}$/);
});

test("verify accepts the right key and rejects the wrong one", () => {
  const key = generateApiKey();
  const stored = hashApiKey(key);
  assert.equal(verifyApiKey(key, stored), true);
  assert.equal(verifyApiKey(generateApiKey(), stored), false);
});

test("keyPrefix never exposes the full secret", () => {
  const key = generateApiKey();
  const prefix = keyPrefix(key);
  assert.ok(prefix.length < key.length / 2);
  assert.ok(prefix.endsWith("…"));
});

test("extracts bearer tokens", () => {
  assert.equal(extractBearerToken("Bearer abc"), "abc");
  assert.equal(extractBearerToken("bearer abc"), "abc"); // schemes are case-insensitive
  assert.equal(extractBearerToken(null), null);
  assert.equal(extractBearerToken("Basic abc"), null);
});

test("normalizeApiKey validates shape", () => {
  const key = generateApiKey();
  assert.throws(() => normalizeApiKey("nope"));
  assert.throws(() => normalizeApiKey("apk_short"));
  assert.equal(normalizeApiKey(`  ${key} `), key);
});