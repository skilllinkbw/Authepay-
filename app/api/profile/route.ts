import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok, readJsonBody, optionalString } from "@/lib/server/api";
import { badRequest } from "@/lib/errors";

interface ProfilePatch {
  full_name?: unknown;
  phone?: unknown;
}

/**
 * GET /api/profile — the caller's own profile.
 * PATCH /api/profile — update the caller's own profile fields (never `role`).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role, onboarding_completed, created_at")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (error) throw badRequest("Failed to load profile", "db_error");
    return ok({ profile: { ...data, email: ctx.email } });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<ProfilePatch>(request);

    const patch: Record<string, string | null> = {};
    if (body.full_name !== undefined) {
      patch.full_name = optionalString(body.full_name, "full_name", 120);
    }
    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === "") {
        patch.phone = null;
      } else {
        patch.phone = optionalString(body.phone, "phone", 32);
      }
    }
    if (Object.keys(patch).length === 0) {
      throw badRequest("Nothing to update");
    }

    // RLS / column grants allow the caller to update only their own
    // full_name/phone/onboarding_completed; role is impossible to set here.
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", ctx.userId)
      .select("id, full_name, phone, role, onboarding_completed, created_at")
      .maybeSingle();
    if (error) throw badRequest("Failed to update profile", "db_error");
    return ok({ profile: data });
  } catch (err) {
    return fail(err);
  }
}