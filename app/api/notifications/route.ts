import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  noContent,
  ok,
  paginationFromUrl,
  readJsonBody,
} from "@/lib/server/api";
import { listNotifications, markNotificationRead } from "@/lib/services/merchant-service";
import { badRequest } from "@/lib/errors";

/** GET /api/notifications — the caller's notifications. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const pagination = paginationFromUrl(request.url);
    const notifications = await listNotifications(supabase, pagination.limit, pagination.offset);
    return ok({ notifications });
  } catch (err) {
    return fail(err);
  }
}

interface MarkReadBody {
  id?: unknown;
}

/** POST /api/notifications — mark one of the caller's notifications as read. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<MarkReadBody>(request);
    if (typeof body.id !== "number" || !Number.isSafeInteger(body.id)) {
      throw badRequest("'id' must be numeric");
    }
    void ctx;
    await markNotificationRead(supabase, ctx.userId, body.id);
    return noContent();
  } catch (err) {
    return fail(err);
  }
}