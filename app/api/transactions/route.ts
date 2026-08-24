import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok, paginationFromUrl } from "@/lib/server/api";
import { listTransactionsForOwner } from "@/lib/services/wallet-service";

/** GET /api/transactions — the caller's transaction history (RLS-scoped). */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await getAuthedContext(supabase);
    const pagination = paginationFromUrl(request.url);
    const transactions = await listTransactionsForOwner(supabase, pagination);
    return ok({ transactions });
  } catch (err) {
    return fail(err);
  }
}