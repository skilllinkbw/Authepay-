import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  ok,
  readJsonBody,
  optionalString,
  requirePhone,
} from "@/lib/server/api";
import { requireOwnWallet } from "@/lib/services/payment-service";
import { executeTransfer } from "@/lib/services/transfer-service";
import { writeAudit } from "@/lib/services/audit-service";
import { idempotencyKeyFromHeaders } from "@/lib/idempotency";
import { badRequest, notFound } from "@/lib/errors";
import { toMinorUnits, DEFAULT_CURRENCY, type Currency } from "@/lib/money";

interface TransferBody {
  recipient_email?: unknown;
  recipient_phone?: unknown;
  amount?: unknown;
  description?: unknown;
}

/**
 * POST /api/transfers — move money between two wallets server-side.
 * Requires an Idempotency-Key header; balances are updated atomically in the
 * database, never on the client.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<TransferBody>(request);

    if (typeof body.amount !== "string" && typeof body.amount !== "number") {
      throw badRequest("'amount' must be a number or decimal string");
    }
    const amountMinor = toMinorUnits(body.amount, DEFAULT_CURRENCY);
    if (amountMinor < 100) throw badRequest("Minimum transfer is P1.00");

    // Resolve the destination account by email or phone (never by client-supplied id).
    let destProfileId: string | null = null;
    if (typeof body.recipient_email === "string" && body.recipient_email.trim() !== "") {
      const email = body.recipient_email.trim().toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      destProfileId = data?.id ?? null;
    } else if (typeof body.recipient_phone === "string" && body.recipient_phone.trim() !== "") {
      const phone = requirePhone(body.recipient_phone);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();
      destProfileId = data?.id ?? null;
    }
    if (!destProfileId) throw notFound("Recipient not found");
    if (destProfileId === ctx.userId) throw badRequest("Cannot transfer to yourself");

    const wallet = await requireOwnWallet(supabase, ctx.userId);
    if (wallet.status !== "active") throw badRequest("Wallet is not active");

    const idempotencyKey = idempotencyKeyFromHeaders((n) => request.headers.get(n));
    if (!idempotencyKey) {
      throw badRequest(
        "'Idempotency-Key' header is required for transfers",
        "missing_idempotency_key"
      );
    }

    const transaction = await executeTransfer(supabase, wallet.id, {
      amountMinor,
      currency: wallet.currency,
      toOwnerType: "user",
      toOwnerId: destProfileId,
      idempotencyKey,
      description: optionalString(body.description, "description", 280),
    });

    await writeAudit({
      actorUserId: ctx.userId,
      action: "transfer.executed",
      entityType: "transaction",
      entityId: String(transaction.reference),
      metadata: { amount_minor: amountMinor },
    });

    return ok({ transaction }, 201);
  } catch (err) {
    return fail(err);
  }
}