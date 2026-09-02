import { createClient } from "@/lib/supabase/server";
import {
  fail,
  getClientIp,
  getAuthedContext,
  getUserAgent,
  ok,
  optionalString,
  paginationFromUrl,
  readJsonBody,
  requirePhone,
} from "@/lib/server/api";
import { initiatePayment, requireOwnWallet } from "@/lib/services/payment-service";
import { writeAudit } from "@/lib/services/audit-service";
import { idempotencyKeyFromHeaders } from "@/lib/idempotency";
import { DEFAULT_CURRENCY, type Currency } from "@/lib/money";
import { badRequest } from "@/lib/errors";

/** GET /api/payments — list payment intents created by the caller. */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const pagination = paginationFromUrl(request.url);
    const { data, error } = await supabase
      .from("payment_intents")
      .select("*")
      .order("created_at", { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1);
    if (error) throw badRequest("Failed to load payments", "db_error");
    return ok({ payments: data ?? [], userId: ctx.userId });
  } catch (err) {
    return fail(err);
  }
}

interface CreatePaymentBody {
  amount?: unknown;
  currency?: unknown;
  description?: unknown;
  customer_phone?: unknown;
}

/**
 * POST /api/payments — initiate a provider-backed collection.
 * Requires an authenticated session; status is never trusted from the client.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getAuthedContext(supabase);
    const body = await readJsonBody<CreatePaymentBody>(request);

    const amountRaw = body.amount;
    if (typeof amountRaw !== "string" && typeof amountRaw !== "number") {
      throw badRequest("'amount' must be a number or decimal string");
    }
    const currency = (
      typeof body.currency === "string" ? body.currency.toUpperCase() : DEFAULT_CURRENCY
    ) as Currency;
    if (currency !== "BWP" && currency !== "USD" && currency !== "ZAR") {
      throw badRequest("Unsupported currency");
    }

    const wallet = await requireOwnWallet(supabase, ctx.userId);
    const idempotencyKey = idempotencyKeyFromHeaders((name) => request.headers.get(name));

    const { transaction, redirect_url } = await initiatePayment(supabase, ctx.userId, wallet.id, {
      amount: amountRaw,
      currency,
      description: optionalString(body.description, "description"),
      customer_phone: body.customer_phone ? requirePhone(body.customer_phone) : null,
      callback_url: null,
      success_url: null,
      idempotency_key: idempotencyKey,
    });

    await writeAudit({
      actorUserId: ctx.userId,
      action: "payment.initiated",
      entityType: "payment_intent",
      entityId: String(transaction.reference),
      metadata: { provider: transaction.provider },
      ip: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return ok({ payment: transaction, redirect_url }, 201);
  } catch (err) {
    return fail(err);
  }
}