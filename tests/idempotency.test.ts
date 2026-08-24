import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateIdempotencyKey,
  idempotencyKeyFromHeaders,
} from "../lib/idempotency.ts";
import { ApiError } from "../lib/errors.ts";

test("accepts well-formed keys", () => {
  const key = validateIdempotencyKey("order-12345");
  assert.equal(key, "order-12345");
  assert.equal(validateIdempotencyKey(null), null);
  assert.equal(validateIdempotencyKey(""), null);
});

test("rejects keys that are too short", () => {
  assert.throws(() => validateIdempotencyKey("short"), (err: unknown) => {
    assert.ok(err instanceof ApiError);
    assert.equal((err as ApiError).status, 400);
    return true;
  });
});

test("rejects keys with invalid characters", () => {
  assert.throws(() => validateIdempotencyKey("bad key with spaces!"));
});

test("reads the key from request headers", () => {
  const key = idempotencyKeyFromHeaders((name) =>
    name === "idempotency-key" ? "header-key-123" : null
  );
  assert.equal(key, "header-key-123");

  const missing = idempotencyKeyFromHeaders(() => null);
  assert.equal(missing, null);
});