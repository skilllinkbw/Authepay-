/**
 * AuthePay commercial plan configuration — single source of truth.
 *
 * Plan STRUCTURE (limits, entitlements) is defined here. Plan PRICING is
 * intentionally `null`: commercial prices have not been signed off by the
 * business, so nothing here may be displayed to customers as a price. When
 * pricing is approved, set `price_bwp_minor_per_month` (integer thebe) and
 * update the billing page copy in the same commit.
 *
 * Enforcement is server-side: subscription state lives in the subscriptions
 * table (migration 013), readable by the owner, writable only by admin RPC.
 * Clients can never set their own plan or status.
 */

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLAN_IDS = ["trial", "growth", "scale"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  /**
   * Monthly price in BWP minor units (thebe). null = pricing not yet
   * commercially approved — do NOT display a number to customers.
   */
  price_bwp_minor_per_month: number | null;
  trial_days: number;
  limits: {
    /** Maximum simultaneously active API keys. */
    api_keys_max: number;
    /**
     * Monthly collected payment volume cap in minor units of the transaction
     * currency. null = uncapped.
     */
    monthly_payment_volume_minor: number | null;
  };
  features: string[];
}

export const TRIAL_DAYS_DEFAULT = 14;

export const PLANS: readonly Plan[] = [
  {
    id: "trial",
    name: "Trial",
    description:
      "Time-limited evaluation of the full platform in test mode.",
    price_bwp_minor_per_month: null, // pricing pending commercial sign-off
    trial_days: TRIAL_DAYS_DEFAULT,
    limits: {
      api_keys_max: 1,
      monthly_payment_volume_minor: 5_000_000, // P50,000 test volume cap
    },
    features: [
      "Test-mode payments",
      "1 active API key",
      "Wallet and transfers",
      "Transaction history",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description:
      "For live merchants collecting payments from customers.",
    price_bwp_minor_per_month: null, // pricing pending commercial sign-off
    trial_days: 0,
    limits: {
      api_keys_max: 5,
      monthly_payment_volume_minor: null,
    },
    features: [
      "Live payment collection (requires completed KYB + provider agreement)",
      "Up to 5 active API keys",
      "Merchant tools and settlements view",
      "Webhook endpoints",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    description:
      "For high-volume merchants and platform partners.",
    price_bwp_minor_per_month: null, // pricing pending commercial sign-off
    trial_days: 0,
    limits: {
      api_keys_max: 25,
      monthly_payment_volume_minor: null,
    },
    features: [
      "Everything in Growth",
      "Up to 25 active API keys",
      "Priority support",
      "Custom settlement terms (contract)",
    ],
  },
] as const;

const BY_PLAN_ID = new Map(PLANS.map((p) => [p.id, p]));

export function getPlan(id: string): Plan | null {
  return (BY_PLAN_ID.get(id as PlanId) as Plan | undefined) ?? null;
}

export const isValidPlanId = (value: unknown): value is PlanId =>
  typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);

export const isValidSubscriptionStatus = (
  value: unknown
): value is SubscriptionStatus =>
  typeof value === "string" &&
  (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);

export interface Subscription {
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

/**
 * True when the account may initiate financial operations.
 * - active / past_due: operational (past_due runs in a grace state)
 * - trialing: operational only until trial_ends_at
 * - suspended / cancelled: never operational
 */
export function subscriptionAllowsPayments(
  sub: Pick<Subscription, "status" | "trial_ends_at">,
  now: Date = new Date()
): boolean {
  switch (sub.status) {
    case "active":
    case "past_due":
      return true;
    case "trialing": {
      if (!sub.trial_ends_at) return true;
      return new Date(sub.trial_ends_at).getTime() > now.getTime();
    }
    default:
      return false;
  }
}

/** Whole days remaining in the trial; 0 when expired or not trialing. */
export function trialDaysRemaining(
  sub: Pick<Subscription, "status" | "trial_ends_at">,
  now: Date = new Date()
): number {
  if (sub.status !== "trialing" || !sub.trial_ends_at) return 0;
  const ms = new Date(sub.trial_ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/** True when the plan permits another active API key. */
export function canCreateApiKey(plan: Plan, activeKeyCount: number): boolean {
  return activeKeyCount < plan.limits.api_keys_max;
}

/** True when the additional amount fits inside the plan's monthly cap. */
export function withinMonthlyVolume(
  plan: Plan,
  usedMinor: number,
  additionalMinor: number
): boolean {
  const cap = plan.limits.monthly_payment_volume_minor;
  if (cap === null) return true;
  return usedMinor + additionalMinor <= cap;
}
