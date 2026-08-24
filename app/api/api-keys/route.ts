import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  ok,
  readJsonBody,
  requireString,
} from "@/lib/server/api";
import { createUserApiKey, listUserApiKeys } from "@/lib/services/api-key-service";
import { writeAudit } from "@/lib/services/audit-service";
import { API_KEY_SCOPES, type ApiKeyScope } from "@/lib/api-keys";

/** GET /api/api-keys — list the caller's API keys (no secrets). */
export async function GET() {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const keys = await listUserApiKeys(supabase);
    return ok({ api_keys: keys });
  } catch (err) {
    return fail(err);
  }
}

interface CreateKeyBody {
  name?: unknown;
  scopes?: unknown;
}

/**
 * POST /api/api-keys — create a key. The plaintext secret is returned exactly
 * once and only a hash is stored.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<CreateKeyBody>(request);

    const name = requireString(body.name, "name", 3, 64);
    const rawScopes = Array.isArray(body.scopes) ? body.scopes : [];
    const scopes = (rawScopes as string[]).filter((s): s is ApiKeyScope =>
      (API_KEY_SCOPES as readonly string[]).includes(s)
    );

    const created = await createUserApiKey(ctx.userId, name, scopes);
    await writeAudit({
      actorUserId: ctx.userId,
      action: "api_key.created",
      entityType: "api_key",
      entityId: created.id,
    });
    return ok(created, 201);
  } catch (err) {
    return fail(err);
  }
}