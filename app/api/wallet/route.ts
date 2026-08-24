import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok, paginationFromUrl } from "@/lib/server/api";
import { getWalletForOwner, listLedgerEntries } from "@/lib/services/wallet-service";
import { fromMinor, type Currency } from "@/lib/money";

/** GET /api/wallet — current user's balance and recent ledger entries. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);

    const wallet = await getWalletForOwner(supabase, "user", ctx.userId);
    const pagination = paginationFromUrl(request.url);
    const ledger = await listLedgerEntries(supabase, wallet.id, pagination);

    return ok({
      wallet: {
        id: wallet.id,
        currency: wallet.currency,
        balance_minor: wallet.balance_minor,
        balance_display: fromMinor(wallet.balance_minor, wallet.currency as Currency),
        status: wallet.status,
      },
      ledger,
    });
  } catch (err) {
    return fail(err);
  }
}