import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  ok,
  optionalString,
  readJsonBody,
  requireString,
} from "@/lib/server/api";
import { createMerchant, listMyMerchants, updateMerchant } from "@/lib/services/merchant-service";
import { writeAudit } from "@/lib/services/audit-service";
import { badRequest } from "@/lib/errors";

/** GET /api/merchants — merchants owned by the caller. */
export async function GET() {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const merchants = await listMyMerchants(supabase);
    return ok({ merchants });
  } catch (err) {
    return fail(err);
  }
}

interface CreateMerchantBody {
  name?: unknown;
  description?: unknown;
}

/** POST /api/merchants — create a merchant owned by the caller. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<CreateMerchantBody>(request);
    const name = requireString(body.name, "name", 2, 80);
    const merchant = await createMerchant(
      supabase,
      ctx.userId,
      name,
      optionalString(body.description, "description")
    );
    await writeAudit({
      actorUserId: ctx.userId,
      action: "merchant.created",
      entityType: "merchant",
      entityId: merchant.id,
    });
    return ok({ merchant }, 201);
  } catch (err) {
    return fail(err);
  }
}

interface PatchMerchantBody {
  id?: unknown;
  name?: unknown;
  description?: unknown;
}

/** PATCH /api/merchants — update a merchant owned by the caller. */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<PatchMerchantBody>(request);
    if (typeof body.id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(body.id)) {
      throw badRequest("'id' must be a valid uuid");
    }
    const patch: { name?: string; description?: string | null } = {};
    if (body.name !== undefined) patch.name = requireString(body.name, "name", 2, 80);
    if (body.description !== undefined) {
      patch.description = optionalString(body.description, "description");
    }
    const merchant = await updateMerchant(supabase, body.id, patch);
    void ctx;
    return ok({ merchant });
  } catch (err) {
    return fail(err);
  }
}