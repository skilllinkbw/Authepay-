import { createClient } from "@/lib/supabase/server";
import { fail, getAuthedContext, ok, readJsonBody } from "@/lib/server/api";
import { getTransactionByReference } from "@/lib/services/wallet-service";
import { canRequestRefund, refundTransaction } from "@/lib/services/transfer-service";
import { writeAudit } from "@/lib/services/audit-service";
import { badRequest, forbidden } from "@/lib/errors";
import { toMinorUnits } from "@/lib/money";

interface RefundBody {
  amount?: unknown;
  reason?: unknown;
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

    // Ownership pre-check (the create_refund RPC re-checks authoritatively):
    // only an admin or the merchant that owns the receiving wallet may refund.
    const allowed = await canRequestRefund(
      ctx.supabase,
      ctx.role,
      original.to_wallet_id,
      ctx.userId
    );
    if (!allowed) throw forbidden("You are not authorized to refund this transaction");

    let amountMinor = original.amount_minor; // default: full refund
    if (body.amount !== undefined && body.amount !== null && body.amount !== "") {
      if (typeof body.amount !== "string" && typeof body.amount !== "number") {
        throw badRequest("'amount' must be a number or decimal string");
      }
      amountMinor = toMinorUnits(body.amount, "BWP");
    }

    // One logical refund request = one key. When the client does not supply a
    // key we derive one deterministically from the reference + amount so that
    // network retries of the same request stay idempotent.
    const idempotencyKey =
      request.headers.get("idempotency-key")?.trim() ||
      `refund-${reference}-${amountMinor}`;

    const reason =
      typeof body.reason === "string" && body.reason.trim().length > 0
        ? body.reason.slice(0, 200)
        : undefined;

    const refunded = await refundTransaction({
      original,
      amountMinor,
      actorId: ctx.userId,
      idempotencyKey,
      reason,
    });
    await writeAudit({
      actorUserId: ctx.userId,
      action: "payment.refunded",
      entityType: "transaction",
      entityId: String(refunded.transaction.reference),
    });
    return ok({ transaction: refunded.transaction, replayed: refunded.replayed }, 201);
  } catch (err) {
    return fail(err);
  }
}