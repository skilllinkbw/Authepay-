import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRefundWithinCap,
  providerStatusToTransactionStatus,
  refundableAmount,
  resultingStatusAfterRefund,
  settlementActionFor,
} from "../lib/payments/settlement.ts";

test("settlement action maps succeeded to settle", () => {
  assert.equal(settlementActionFor("succeeded"), "settle");
});

test("settlement action maps failed and cancelled to fail", () => {
  assert.equal(settlementActionFor("failed"), "fail");
  assert.equal(settlementActionFor("cancelled"), "fail");
});

test("settlement action never maps pending or unknown to success", () => {
  assert.equal(settlementActionFor("pending"), null);
  assert.equal(settlementActionFor(null), null);
  assert.equal(settlementActionFor("processing"), null);
  assert.equal(settlementActionFor("garbage"), null);
});

test("provider pending maps to processing, never succeeded", () => {
  assert.equal(providerStatusToTransactionStatus("pending"), "processing");
  assert.equal(providerStatusToTransactionStatus("succeeded"), "succeeded");
  assert.equal(providerStatusToTransactionStatus("failed"), "failed");
  assert.equal(providerStatusToTransactionStatus("cancelled"), "cancelled");
  assert.equal(providerStatusToTransactionStatus(null), null);
  assert.equal(providerStatusToTransactionStatus("processing"), null);
});

test("refundable amount is capped at the original amount", () => {
  assert.equal(refundableAmount(10_000, 0), 10_000);
  assert.equal(refundableAmount(10_000, 4_000), 6_000);
  assert.equal(refundableAmount(10_000, 10_000), 0);
  assert.equal(refundableAmount(10_000, 99_999), 0);
  assert.equal(refundableAmount(0, 0), 0);
  assert.equal(refundableAmount(-5, 0), 0);
});

test("refund within cap is accepted; exceeding it is rejected", () => {
  assert.equal(isRefundWithinCap(10_000, 0, 10_000), true);
  assert.equal(isRefundWithinCap(10_000, 4_000, 6_000), true);
  assert.equal(isRefundWithinCap(10_000, 4_000, 6_001), false);
  assert.equal(isRefundWithinCap(10_000, 0, 10_001), false);
  assert.equal(isRefundWithinCap(10_000, 0, 0), false);
  assert.equal(isRefundWithinCap(10_000, 0, -50), false);
});

test("resulting status is refunded only when the remaining amount is covered", () => {
  assert.equal(resultingStatusAfterRefund(10_000, 0, 10_000), "refunded");
  assert.equal(resultingStatusAfterRefund(10_000, 4_000, 6_000), "refunded");
  assert.equal(resultingStatusAfterRefund(10_000, 0, 9_999), "partially_refunded");
  assert.equal(resultingStatusAfterRefund(10_000, 8_000, 1_000), "partially_refunded");
});