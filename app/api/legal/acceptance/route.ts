import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  getClientIp,
  getUserAgent,
  ok,
  readJsonBody,
} from "@/lib/server/api";
import {
  listPolicyAcceptances,
  missingRequiredPolicies,
  recordPolicyAcceptance,
} from "@/lib/services/legal-service";
import { writeAudit } from "@/lib/services/audit-service";
import { requiredSignupPolicies } from "@/lib/legal/policies";

/**
 * GET /api/legal/acceptance — the caller's acceptance records plus any
 * required policies whose current version has not yet been accepted.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const acceptances = await listPolicyAcceptances(supabase);
    return ok({
      acceptances,
      required: requiredSignupPolicies().map((p) => ({
        policy_id: p.id,
        version: p.version,
        title: p.title,
      })),
      missing: missingRequiredPolicies(acceptances),
    });
  } catch (err) {
    return fail(err);
  }
}

interface AcceptanceBody {
  policy_id?: unknown;
  policy_version?: unknown;
}

/**
 * POST /api/legal/acceptance — record acceptance of a policy's current
 * version. The policy id and version are validated server-side against the
 * registry; acceptance of unknown or superseded versions is rejected.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<AcceptanceBody>(request);

    const recorded = await recordPolicyAcceptance(
      ctx.userId,
      body.policy_id,
      body.policy_version,
      getClientIp(request),
      getUserAgent(request)
    );

    await writeAudit({
      actorUserId: ctx.userId,
      action: "legal.policy_accepted",
      entityType: "policy",
      entityId: `${recorded.policy_id}@${recorded.policy_version}`,
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return ok({ acceptance: recorded }, 201);
  } catch (err) {
    return fail(err);
  }
}
