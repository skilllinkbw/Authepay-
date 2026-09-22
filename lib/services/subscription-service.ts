/**
 * Subscription / commercial entitlement service (server-side only).
 *
 * Reads the account's subscription row (owner-visible via RLS; mutations only
 * through the admin-guarded set_subscription RPC) and enforces plan limits
 * before financial operations. Clients can never set their own plan.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, forbidden } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import {
  canCreateApiKey,
  getPlan,
  isValidPlanId,
  isValidSubscriptionStatus,
  subscriptionAllowsPayments,
  withinMonthlyVolume,
  type Plan,
  type Subscription,
} from "../commercial/plans.ts";
import { logger } from "../logger.ts";

function dbError(message: string): ApiError {
  return new ApiError(500, "db_error", message);
}

/** Fetch the caller's subscription (RLS-scoped). Falls back to trial. */
export async function getSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<Subscription> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("user_id,plan,status,trial_ends_at,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    logger.error("subscription lookup failed", { message: error.message });
    throw dbError("Failed to load subscription");
  }
  if (data && isValidPlanId(data.plan) && isValidSubscriptionStatus(data.status)) {
    return data as Subscription;
  }
  // Accounts created before migration 013 backfill: treated as fresh trial.
  return {
    user_id: userId,
    plan: "trial",
    status: "trialing",
    trial_ends_at: null,
    current_period_end: null,
  };
}

export function getPlanFor(sub: Subscription): Plan {
  const plan = getPlan(sub.plan);
  if (!plan) throw dbError("Unknown plan on subscription");
  return plan;
}

/** Throw 403 when the account's subscription blocks financial operations. */
export function assertPaymentsAllowed(sub: Subscription): void {
  if (subscriptionAllowsPayments(sub)) return;
  if (sub.status === "trialing") {
    throw forbidden(
      "Your trial has expired. Please choose a plan to continue."
    );
  }
  throw forbidden(
    `Payments are unavailable while your account is '${sub.status}'.`
  );
}

/** Count the user's active API keys (service role; RLS-independent). */
export async function countActiveApiKeys(userId: string): Promise<number> {
  const admin = requireAdminClient();
  const { count, error } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("owner_type", "user")
    .eq("owner_id", userId)
    .eq("status", "active");
  if (error) throw dbError("Failed to count API keys");
  return count ?? 0;
}

/** Throw 403 when the plan's active-key limit is reached. */
export function assertApiKeyAllowed(plan: Plan, activeCount: number): void {
  if (!canCreateApiKey(plan, activeCount)) {
    throw forbidden(
      `Your ${plan.name} plan allows at most ${plan.limits.api_keys_max} active API key(s). Revoke a key or upgrade your plan.`
    );
  }
}

/**
 * Sum this calendar month's collected payment volume (minor units) for the
 * user, across non-failed payment intents. Used to enforce plan volume caps.
 */
export async function monthlyPaymentVolumeMinor(
  userId: string,
  currency: string
): Promise<number> {
  const admin = requireAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const { data: wallets, error: wErr } = await admin
    .from("wallets")
    .select("id")
    .eq("owner_type", "user")
    .eq("owner_id", userId);
  if (wErr) throw dbError("Failed to load wallet");
  const ids = (wallets ?? []).map((w) => (w as { id: string }).id);
  if (ids.length === 0) return 0;

  const { data, error } = await admin
    .from("payment_intents")
    .select("amount_minor")
    .eq("currency", currency)
    .in("wallet_id", ids)
    .gte("created_at", monthStart.toISOString())
    .in("status", ["pending", "processing", "succeeded", "partially_refunded", "refunded"]);
  if (error) throw dbError("Failed to compute monthly volume");
  return (data ?? []).reduce(
    (sum, row) => sum + Number((row as { amount_minor: number }).amount_minor),
    0
  );
}

/** Throw 402 when the plan's monthly volume cap would be exceeded. */
export function assertVolumeAllowed(
  plan: Plan,
  usedMinor: number,
  additionalMinor: number
): void {
  if (!withinMonthlyVolume(plan, usedMinor, additionalMinor)) {
    throw new ApiError(
      402,
      "plan_limit_exceeded",
      `This payment would exceed your ${plan.name} plan's monthly volume limit.`
    );
  }
}
