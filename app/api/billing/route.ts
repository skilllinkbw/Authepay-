import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok } from "@/lib/server/api";
import {
  countActiveApiKeys,
  getPlanFor,
  getSubscription,
  monthlyPaymentVolumeMinor,
} from "@/lib/services/subscription-service";
import { trialDaysRemaining } from "@/lib/commercial/plans";

/**
 * GET /api/billing — the caller's subscription, plan entitlements, and
 * current usage. Prices are intentionally absent until commercially approved.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const subscription = await getSubscription(supabase, ctx.userId);
    const plan = getPlanFor(subscription);

    const activeApiKeys = await countActiveApiKeys(ctx.userId);
    const monthlyVolumeMinor = await monthlyPaymentVolumeMinor(
      ctx.userId,
      "BWP"
    );

    return ok({
      subscription,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        features: plan.features,
        limits: plan.limits,
        // null until commercial pricing is approved — never display a price.
        price_bwp_minor_per_month: plan.price_bwp_minor_per_month,
      },
      trial_days_remaining: trialDaysRemaining(subscription),
      usage: {
        active_api_keys: activeApiKeys,
        monthly_payment_volume_minor: monthlyVolumeMinor,
      },
    });
  } catch (err) {
    return fail(err);
  }
}
