import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PAYMENT_STATUS_TRANSITIONS,
  assertValidStatusTransition,
  directionForType,
  canRefund,
} from "../lib/payments/state.ts";
import { InvalidStateTransitionError } from "../lib/errors.ts";
import { PAYMENT_STATUSES } from "../lib/types.ts";

test("happy path transitions are allowed", () => {
  assert.doesNotThrow(() => assertValidStatusTransition("pending", "processing"));
  assert.doesNotThrow(() => assertValidStatusTransition("processing", "succeeded"));
  assert.doesNotThrow(() => assertValidStatusTransition("pending", "failed"));
  assert.doesNotThrow(() => assertValidStatusTransition("succeeded", "refunded"));
});

test("terminal states reject further transitions", () => {
  for (const terminal of ["cancelled", "refunded"] as const) {
    const allowed = PAYMENT_STATUS_TRANSITIONS[terminal];
    assert.equal(allowed.length, 0, `${terminal} should be terminal`);
    for (const next of PAYMENT_STATUSES) {
      assert.throws(
        () => assertValidStatusTransition(terminal, next),
        InvalidStateTransitionError,
        `${terminal} -> ${next} must be rejected`
      );
    }
  }
});

test("money cannot reappear after failure", () => {
  assert.throws(() => assertValidStatusTransition("failed", "succeeded"), InvalidStateTransitionError);
});

test("direction mapping covers every payment type", () => {
  assert.equal(directionForType("deposit"), "credit");
  assert.equal(directionForType("topup"), "credit");
  assert.equal(directionForType("refund"), "credit");
  assert.equal(directionForType("withdrawal"), "debit");
  assert.equal(directionForType("payment"), "debit");
  assert.equal(directionForType("transfer"), "debit");
});

test("refunds only apply to succeeded payments", () => {
  assert.ok(canRefund("succeeded"));
  assert.ok(canRefund("partially_refunded"));
  for (const s of ["pending", "processing", "failed", "cancelled", "refunded"] as const) {
    assert.equal(canRefund(s), false);
  }
});