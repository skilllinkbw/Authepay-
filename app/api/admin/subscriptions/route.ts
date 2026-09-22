import { createClient } from "@/lib/supabase/server";
import {
  fail,
  ok,
  paginationFromUrl,
  readJsonBody,
  requireRole,
} from "@/lib/server/api";
import { requireAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/services/audit-service";
import { isValidPlanId, isValidSubscriptionStatus } from "@/lib/commercial/plans";
import { badRequest, forbidden } from "@/lib/errors";

/** GET /api/admin/subscriptions — list account subscriptions (admin only). */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await requireRole(supabase, ["admin"]);
    const pagination = paginationFromUrl(request.url);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("user_id,plan,status,trial_ends_at,current_period_end,updated_at")
      .order("updated_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);
    if (error) throw badRequest("Failed to load subscriptions", "db_error");
    return ok({ subscriptions: data ?? [] });
  } catch (err) {
    return fail(err);
  }
}

interface PatchBody {
  user_id?: unknown;
  plan?: unknown;
  status?: unknown;
}

/**
 * PATCH /api/admin/subscriptions — set an account's plan/status (admin only).
 * Authorization is checked here AND re-checked inside the security-definer
 * set_subscription RPC.
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await requireRole(supabase, ["admin"]);
    const body = await readJsonBody<PatchBody>(request);

    if (typeof body.user_id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(body.user_id)) {
      throw badRequest("'user_id' must be a valid uuid");
    }
    if (!isValidPlanId(body.plan)) throw badRequest("Invalid plan");
    if (!isValidSubscriptionStatus(body.status)) throw badRequest("Invalid status");

    const admin = requireAdminClient();
    const { data, error } = await admin.rpc("set_subscription", {
      p_user_id: body.user_id,
      p_plan: body.plan,
      p_status: body.status,
      p_actor: ctx.userId,
    });
    if (error) {
      if (/forbidden/.test(error.message ?? "")) throw forbidden();
      throw badRequest("Failed to update subscription", "db_error");
    }
    await writeAudit({
      actorUserId: ctx.userId,
      action: "subscription.updated",
      entityType: "subscription",
      entityId: body.user_id,
      metadata: { plan: body.plan, status: body.status },
    });
    return ok({ subscription: data });
  } catch (err) {
    return fail(err);
  }
}
