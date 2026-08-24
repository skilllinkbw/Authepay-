import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSignature,
  verifySignature,
  isWithinReplayWindow,
  SIGNATURE_PREFIX,
} from "../lib/webhooks/verify.ts";
import { buildPayload, signPayload, nextRetryDelaySeconds } from "../lib/webhooks/outbound.ts";

const SECRET = "whsec_test_secret";

test("signatures round-trip and reject tampering", () => {
  const body = JSON.stringify({ event_type: "payment.succeeded" });
  const sig = computeSignature(SECRET, body);
  assert.ok(sig.startsWith(SIGNATURE_PREFIX));
  assert.equal(verifySignature(SECRET, body, sig), true);

  const tampered = body.replace("succeeded", "failed");
  assert.equal(verifySignature(SECRET, tampered, sig), false);
});

test("wrong secret or missing signature fails closed", () => {
  const body = "{}";
  const sig = computeSignature(SECRET, body);
  assert.equal(verifySignature("whsec_other", body, sig), false);
  assert.equal(verifySignature(SECRET, body, null), false);
  assert.equal(verifySignature(SECRET, body, "sha256=deadbeef"), false);
});

test("replay window rejects stale events", () => {
  const now = 1_800_000_000;
  assert.equal(isWithinReplayWindow(now - 10, now), true);
  assert.equal(isWithinReplayWindow(now + 60, now), true);
  assert.equal(isWithinReplayWindow(now - 400, now), false); // older than 5 min
});

test("outbound payloads are signed deterministically", () => {
  const payload = buildPayload("evt_1", "payment.succeeded", { reference: "AP_TXN_X" });
  const a = signPayload(SECRET, payload);
  const b = signPayload(SECRET, payload);
  assert.equal(a, b);
  assert.notEqual(a, signPayload("other-secret", payload));
});

test("retry backoff grows then stops", () => {
  const first = nextRetryDelaySeconds(0) as number;
  const later = nextRetryDelaySeconds(3) as number;
  assert.equal(first, 60);
  assert.ok(later > first);
  assert.equal(nextRetryDelaySeconds(5), null); // schedule exhausted
});