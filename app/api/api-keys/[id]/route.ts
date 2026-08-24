import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, noContent } from "@/lib/server/api";
import { revokeUserApiKey } from "@/lib/services/api-key-service";
import { writeAudit } from "@/lib/services/audit-service";

/** DELETE /api/api-keys/[id] — revoke the caller's own key. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const { id } = await context.params;
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return noContent(); // treat malformed ids as already-gone (no enumeration)
    }
    await revokeUserApiKey(ctx.userId, id);
    await writeAudit({
      actorUserId: ctx.userId,
      action: "api_key.revoked",
      entityType: "api_key",
      entityId: id,
    });
    return noContent();
  } catch (err) {
    return fail(err);
  }
}