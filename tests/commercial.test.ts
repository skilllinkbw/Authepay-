import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PLANS,
  PLAN_IDS,
  SUBSCRIPTION_STATUSES,
  canCreateApiKey,
  getPlan,
  isValidPlanId,
  isValidSubscriptionStatus,
  subscriptionAllowsPayments,
  trialDaysRemaining,
  withinMonthlyVolume,
} from "../lib/commercial/plans.ts";

test("plan registry is complete and internally consistent", () => {
  assert.equal(PLANS.length, PLAN_IDS.length);
  for (const plan of PLANS) {
    assert.ok(PLAN_IDS.includes(plan.id));
    assert.ok(plan.limits.api_keys_max > 0);
    assert.ok(plan.features.length > 0);
    assert.equal(getPlan(plan.id)?.id, plan.id);
  }
});

test("no plan carries a fabricated price before commercial sign-off", () => {
  // Guard: prices must stay null until the business approves them. Setting a
  // price requires intentionally updating this test in the same commit.
  for (const plan of PLANS) {
    assert.equal(
      plan.price_bwp_minor_per_month,
      null,
      `plan '${plan.id}' has a price that was never commercially approved`
    );
  }
});

test("active and past_due subscriptions may transact; suspended and cancelled may not", () => {
  assert.equal(subscriptionAllowsPayments({ status: "active", trial_ends_at: null }), true);
  assert.equal(subscriptionAllowsPayments({ status: "past_due", trial_ends_at: null }), true);
  assert.equal(subscriptionAllowsPayments({ status: "suspended", trial_ends_at: null }), false);
  assert.equal(subscriptionAllowsPayments({ status: "cancelled", trial_ends_at: null }), false);
});

test("trialing accounts may transact only until trial expiry", () => {
  const now = new Date("2026-09-22T00:00:00Z");
  const future = { status: "trialing" as const, trial_ends_at: "2026-09-30T00:00:00Z" };
  const past = { status: "trialing" as const, trial_ends_at: "2026-09-01T00:00:00Z" };
  assert.equal(subscriptionAllowsPayments(future, now), true);
  assert.equal(subscriptionAllowsPayments(past, now), false);
  assert.equal(trialDaysRemaining(future, now), 8);
  assert.equal(trialDaysRemaining(past, now), 0);
});

test("API key limits are enforced per plan", () => {
  const trial = getPlan("trial")!;
  const scale = getPlan("scale")!;
  assert.equal(canCreateApiKey(trial, 0), true);
  assert.equal(canCreateApiKey(trial, trial.limits.api_keys_max), false);
  assert.equal(canCreateApiKey(scale, scale.limits.api_keys_max - 1), true);
  assert.equal(canCreateApiKey(scale, scale.limits.api_keys_max), false);
});

test("monthly volume caps reject overflow and uncapped plans accept anything", () => {
  const trial = getPlan("trial")!;
  const cap = trial.limits.monthly_payment_volume_minor!;
  assert.equal(withinMonthlyVolume(trial, cap - 100, 100), true);
  assert.equal(withinMonthlyVolume(trial, cap - 100, 101), false);
  const growth = getPlan("growth")!;
  assert.equal(withinMonthlyVolume(growth, Number.MAX_SAFE_INTEGER - 1, 1), true);
});

test("status and plan validators reject unknown values", () => {
  for (const s of SUBSCRIPTION_STATUSES) assert.equal(isValidSubscriptionStatus(s), true);
  assert.equal(isValidSubscriptionStatus("refunded"), false);
  assert.equal(isValidSubscriptionStatus(undefined), false);
  assert.equal(isValidPlanId("trial"), true);
  assert.equal(isValidPlanId("enterprise"), false);
  assert.equal(isValidPlanId(null), false);
});
