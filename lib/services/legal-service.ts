/**
 * Legal policy acceptance service (server-side only).
 *
 * Acceptance rows are append-only and idempotent: re-accepting the same
 * policy version returns the original record. Versions are validated against
 * the registry in lib/legal/policies.ts before anything is written, so a
 * client cannot record acceptance of a non-existent or superseded policy.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, badRequest } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import {
  isCurrentPolicyVersion,
  requiredSignupPolicies,
} from "../legal/policies.ts";
import { logger } from "../logger.ts";

export interface PolicyAcceptance {
  policy_id: string;
  policy_version: string;
  accepted_at: string;
}

function dbError(message: string): ApiError {
  return new ApiError(500, "db_error", message);
}

/** Record one acceptance for the user. Idempotent per (policy, version). */
export async function recordPolicyAcceptance(
  userId: string,
  policyId: unknown,
  policyVersion: unknown,
  ip: string | null,
  userAgent: string | null
): Promise<PolicyAcceptance> {
  if (typeof policyId !== "string" || typeof policyVersion !== "string") {
    throw badRequest("'policy_id' and 'policy_version' must be strings");
  }
  if (!isCurrentPolicyVersion(policyId, policyVersion)) {
    throw badRequest(
      "Unknown or outdated policy version",
      "unknown_policy_version"
    );
  }

  const admin = requireAdminClient();
  const { data, error } = await admin.rpc("record_policy_acceptance", {
    p_user_id: userId,
    p_policy_id: policyId,
    p_policy_version: policyVersion,
    p_ip: ip,
    p_user_agent: userAgent,
  });
  if (error) {
    logger.error("record_policy_acceptance failed", { message: error.message });
    throw dbError("Failed to record policy acceptance");
  }
  const row = data as PolicyAcceptance;
  return {
    policy_id: row.policy_id,
    policy_version: row.policy_version,
    accepted_at: row.accepted_at,
  };
}

/** Read the caller's acceptance records (RLS restricts to own rows). */
export async function listPolicyAcceptances(
  supabase: SupabaseClient
): Promise<PolicyAcceptance[]> {
  const { data, error } = await supabase
    .from("policy_acceptances")
    .select("policy_id,policy_version,accepted_at");
  if (error) throw dbError("Failed to load policy acceptances");
  return (data ?? []) as PolicyAcceptance[];
}

/** Required policies whose current version the user has NOT yet accepted. */
export function missingRequiredPolicies(acceptances: PolicyAcceptance[]) {
  const accepted = new Set(
    acceptances.map((a) => `${a.policy_id}@${a.policy_version}`)
  );
  return requiredSignupPolicies()
    .filter((p) => !accepted.has(`${p.id}@${p.version}`))
    .map((p) => ({ policy_id: p.id, version: p.version, title: p.title }));
}
