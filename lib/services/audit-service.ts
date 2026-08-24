/**
 * Audit logging — append-only, server-side only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminClient } from "../supabase/admin.ts";
import { logger } from "../logger.ts";

export interface AuditInput {
  actorUserId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Write an audit record; failures are logged but never break payment flow. */
export async function writeAudit(input: AuditInput): Promise<void> {
  const admin = requireAdminClient();
  try {
    const { error } = await admin.rpc("insert_audit_log", {
      p_actor_user_id: input.actorUserId,
      p_action: input.action,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
      p_metadata: input.metadata ?? null,
      p_ip: input.ip ?? null,
      p_user_agent: input.userAgent ?? null,
    });
    if (error) throw error;
  } catch (err) {
    logger.warn("audit write failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Read audit logs (admin only). */
export async function listAuditLogs(
  supabase: SupabaseClient,
  limit: number,
  offset: number
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error("failed to load audit logs");
  return data ?? [];
}