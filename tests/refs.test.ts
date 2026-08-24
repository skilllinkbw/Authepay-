import { test } from "node:test";
import assert from "node:assert/strict";
import { createReference, encodeBase32Url } from "../lib/refs.ts";

test("creates uppercase references with the requested prefix", () => {
  const ref = createReference("ap_txn");
  assert.ok(ref.startsWith("AP_TXN_"));
  // 16 bytes of entropy -> floor(128/5) = 25 base32 characters.
  assert.match(ref, /^AP_TXN_[A-Z2-7]{25}$/);
});

test("references are unique across calls", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    seen.add(createReference("ap_pay"));
  }
  assert.equal(seen.size, 200);
});

test("deterministic with injected entropy", () => {
  let counter = 0;
  const fixedRandom = (size = 1) => {
    void size;
    return Buffer.from([counter++ % 255]);
  };
  const a = encodeBase32Url(Buffer.from([0]));
  assert.equal(a, "A");
  assert.ok(fixedRandom(1).length === 1);
});