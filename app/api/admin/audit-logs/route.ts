import { createClient } from "@/lib/supabase/server";
import {
  fail,
  ok,
  paginationFromUrl,
  requireRole,
} from "@/lib/server/api";
import { listAuditLogs } from "@/lib/services/audit-service";

/** GET /api/admin/audit-logs — admin only. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await requireRole(supabase, ["admin"]);
    const pagination = paginationFromUrl(request.url);
    const logs = await listAuditLogs(supabase, pagination.limit, pagination.offset);
    return ok({ logs });
  } catch (err) {
    return fail(err);
  }
}