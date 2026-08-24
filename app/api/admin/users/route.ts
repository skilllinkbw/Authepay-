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
import { isValidRole } from "@/lib/types";
import { badRequest, forbidden } from "@/lib/errors";

/** GET /api/admin/users — list profiles (admin only). */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await requireRole(supabase, ["admin"]);
    const pagination = paginationFromUrl(request.url);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,status,created_at")
      .order("created_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);
    if (error) throw badRequest("Failed to load users", "db_error");
    return ok({ users: data ?? [] });
  } catch (err) {
    return fail(err);
  }
}

interface PatchUserBody {
  id?: unknown;
  role?: unknown;
}

/** PATCH /api/admin/users — change a user's role (admin only). */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await requireRole(supabase, ["admin"]);
    const body = await readJsonBody<PatchUserBody>(request);

    if (typeof body.id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(body.id)) {
      throw badRequest("'id' must be a valid uuid");
    }
    if (!isValidRole(body.role)) throw badRequest("Invalid role");

    const admin = requireAdminClient();
    const { error } = await admin.rpc("set_user_role", {
      p_user_id: body.id,
      p_role: body.role as string,
      p_actor: ctx.userId,
    });
    if (error) {
      if (/forbidden/.test(error.message ?? "")) throw forbidden();
      throw badRequest("Failed to update role", "db_error");
    }
    await writeAudit({
      actorUserId: ctx.userId,
      action: "user.role_changed",
      entityType: "profile",
      entityId: body.id,
      metadata: { role: body.role },
    });
    return ok({ updated: true });
  } catch (err) {
    return fail(err);
  }
}