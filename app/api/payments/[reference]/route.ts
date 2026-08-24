import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok } from "@/lib/server/api";
import { getTransactionByReference } from "@/lib/services/wallet-service";
import { badRequest } from "@/lib/errors";

/** GET /api/payments/[reference] — a single transaction the caller owns. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const { reference } = await context.params;
    if (!/^[A-Z0-9_-]{6,64}$/i.test(reference)) {
      throw badRequest("Invalid reference format");
    }
    // RLS restricts this lookup to transactions visible to the caller.
    const transaction = await getTransactionByReference(supabase, reference);
    return ok({ transaction });
  } catch (err) {
    return fail(err);
  }
}