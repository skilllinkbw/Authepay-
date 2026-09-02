import { test } from "node:test";
import assert from "node:assert/strict";
import { mapPostgresError } from "../lib/services/payment-service.ts";
import { ApiError, IdempotencyConflictError, InsufficientFundsError } from "../lib/errors.ts";

function codeFor(message: string): string {
  try {
    mapPostgresError(new Error(message));
  } catch (err) {
    if (err instanceof ApiError) return err.code;
    return `NOT_APERROR:${String(err)}`;
  }
  return "NO_THROW";
}

test("maps financial error codes to typed ApiErrors", () => {
  assert.equal(codeFor("insufficient_funds"), "insufficient_funds");
  assert.equal(codeFor("wallet_not_found"), "not_found");
  assert.equal(codeFor("destination_wallet_not_found"), "not_found");
  assert.equal(codeFor("transaction_not_found"), "not_found");
  assert.equal(codeFor("intent_not_found"), "not_found");
  assert.equal(codeFor("not_refundable"), "not_refundable");
  assert.equal(codeFor("refund_exceeds_refundable"), "refund_exceeds_refundable");
  assert.equal(codeFor("refund_forbidden"), "refund_forbidden");
  assert.equal(codeFor("currency_mismatch"), "currency_mismatch");
  assert.equal(codeFor("no_settlement_wallet"), "no_settlement_wallet");
  assert.equal(codeFor("intent_not_settleable"), "intent_not_settleable");
  assert.equal(codeFor("unexpected_state:failed:pending"), "invalid_state_transition");
  assert.equal(codeFor("invalid_transition:succeeded:cancelled"), "invalid_state_transition");
  assert.equal(codeFor("role_change_forbidden"), "role_change_forbidden");
});

test("maps duplicate-key violations to idempotency conflicts", () => {
  const msg = 'duplicate key value violates unique constraint "transactions_reference_key"';
  assert.throws(() => mapPostgresError(new Error(msg)), IdempotencyConflictError);
});

test("maps insufficient funds to the typed error", () => {
  assert.throws(() => mapPostgresError(new Error("insufficient_funds")), InsufficientFundsError);
});

test("unknown errors become a generic db_error (no internal leak)", () => {
  const err = codeFor("some_postgres_implementation_detail_at_secret_path");
  assert.equal(err, "db_error");
});