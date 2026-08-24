import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok, readJsonBody } from "@/lib/server/api";
import { getTransactionByReference } from "@/lib/services/wallet-service";
import { refundTransaction } from "@/lib/services/transfer-service";
import { writeAudit } from "@/lib/services/audit-service";
import { badRequest } from "@/lib/errors";
import { toMinorUnits } from "@/lib/money";

interface RefundBody {
  amount?: unknown;
}

/** POST /api/payments/[reference]/refund — refund a succeeded payment. */
export async function POST(
  request: Request,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const { reference } = await context.params;
    if (!/^[A-Z0-9_-]{6,64}$/i.test(reference)) {
      throw badRequest("Invalid reference format");
    }

    const body = await readJsonBody<RefundBody>(request).catch(() => ({}) as RefundBody);
    const original = await getTransactionByReference(supabase, reference);

    let amountMinor = original.amount_minor; // default: full refund
    if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
      if (typeof body.amount !== "string" && typeof body.amount !== "number") {
        throw badRequest("'amount' must be a number or decimal string");
      }
      amountMinor = toMinorUnits(body.amount, "BWP");
    }

    const refunded = await refundTransaction(original, amountMinor, ctx.userId);
    await writeAudit({
      actorUserId: ctx.userId,
      action: "payment.refunded",
      entityType: "transaction",
      entityId: String(refunded.reference),
    });
    return ok({ transaction: refunded }, 201);
  } catch (err) {
    return fail(err);
  }
}