import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getAuthedContext,
  ok,
  readJsonBody,
  optionalString,
  requirePhone,
} from "@/lib/server/api";
import { requireAdminClient } from "@/lib/supabase/admin";
import { requireOwnWallet } from "@/lib/services/payment-service";
import { executeTransfer } from "@/lib/services/transfer-service";
import { writeAudit } from "@/lib/services/audit-service";
import { idempotencyKeyFromHeaders } from "@/lib/idempotency";
import { badRequest, notFound } from "@/lib/errors";
import { toMinorUnits, DEFAULT_CURRENCY } from "@/lib/money";

interface TransferBody {
  recipient_email?: unknown;
  recipient_phone?: unknown;
  amount?: unknown;
  description?: unknown;
}

interface RecipientLookup {
  user_id: string;
  full_name: string | null;
  wallet_id: string;
}

/**
 * POST /api/transfers — move money between two wallets server-side.
 * Requires an Idempotency-Key header; balances are updated atomically in the
 * database, never on the client. Recipients are resolved through a SECURITY
 * DEFINER RPC because RLS hides other users' profiles.
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

    // Resolve the destination account by email or phone (never by client id).
    let email: string | null = null;
    let phone: string | null = null;
    if (typeof body.recipient_email === "string" && body.recipient_email.trim() !== "") {
      email = body.recipient_email.trim().toLowerCase();
    } else if (typeof body.recipient_phone === "string" && body.recipient_phone.trim() !== "") {
      phone = requirePhone(body.recipient_phone);
    }
    if (!email && !phone) {
      throw badRequest("Provide a recipient email or phone");
    }

    const admin = requireAdminClient();
    const { data: lookup, error: lookupError } = await admin.rpc(
      "lookup_transfer_recipient",
      { p_email: email, p_phone: phone }
    );
    if (lookupError) throw badRequest("Failed to resolve recipient", "db_error");
    const recipient = (lookup ?? null) as RecipientLookup | null;
    if (!recipient?.user_id) throw notFound("Recipient not found");
    if (recipient.user_id === ctx.userId) throw badRequest("Cannot transfer to yourself");

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
      toOwnerId: recipient.user_id,
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