/**
 * Payment service — provider-backed collection pipeline.
 *
 * Financial mutations run through Postgres SECURITY DEFINER functions via the
 * admin (service-role) client; the browser never writes to these tables and
 * payment status is never trusted from the client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApiError,
  badRequest,
  IdempotencyConflictError,
  InsufficientFundsError,
  notFound,
} from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import { toMinorUnits, type Currency } from "../money.ts";
import { createReference } from "../refs.ts";
import { logger } from "../logger.ts";
import { defaultProvider } from "../providers/registry.ts";
import type { Transaction, Wallet } from "../types.ts";

export interface InitiatePaymentInput {
  amount: string | number;
  currency: Currency;
  description?: string | null;
  customer_phone?: string | null;
  callback_url?: string | null;
  success_url?: string | null;
  idempotency_key?: string | null;
}

/** Translate Postgres errors into typed ApiErrors without leaking internals. */
export function mapPostgresError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (/insufficient_funds/.test(message)) throw new InsufficientFundsError();
  if (/wallet_not_found|destination_wallet_not_found/.test(message)) {
    throw notFound("Wallet not found");
  }
  if (/transaction_not_found/.test(message)) throw notFound("Transaction not found");
  if (/not_refundable/.test(message)) {
    throw new ApiError(409, "not_refundable", "Only succeeded payments can be refunded");
  }
  if (/unexpected_state/.test(message)) {
    throw new ApiError(409, "invalid_state_transition", "Transaction is in an unexpected state");
  }
  if (/duplicate key value/i.test(message)) throw new IdempotencyConflictError();
  logger.error("Financial operation failed", { message });
  throw new ApiError(500, "db_error", "Financial operation failed");
}

/** Look up a wallet owned by this user. */
export async function requireOwnWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("owner_type", "user")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new ApiError(500, "db_error", "Failed to load wallet");
  if (!data) throw notFound("Wallet not found");
  return data as Wallet;
}

/** Initiate a provider-backed payment for a wallet owner. */
export async function initiatePayment(
  supabase: SupabaseClient,
  userId: string,
  walletId: string,
  input: InitiatePaymentInput
): Promise<Transaction> {
  const amountMinor = toMinorUnits(input.amount, input.currency);
  if (amountMinor < 100) throw badRequest("Minimum amount is P1.00");

  const reference = createReference("ap_pay");
  const admin = requireAdminClient();
  const provider = defaultProvider();

  // 1) Persist the intent first (idempotent on idempotency_key).
  let intentRow: Record<string, unknown> | null = null;
  try {
    const { data, error } = await admin.rpc("create_payment_intent", {
      p_creator_user_id: userId,
      p_merchant_id: null,
      p_wallet_id: walletId,
      p_amount_minor: amountMinor,
      p_currency: input.currency,
      p_reference: reference,
      p_idempotency_key: input.idempotency_key ?? reference,
      p_provider: provider.name,
      p_description: input.description ?? null,
      p_customer_phone: input.customer_phone ?? null,
      p_callback_url: input.callback_url ?? null,
      p_success_url: input.success_url ?? null,
      p_expires_at: null,
      p_metadata: {},
    });
    if (error) mapPostgresError(error);
    intentRow = (data ?? null) as Record<string, unknown> | null;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    mapPostgresError(err);
  }
  if (!intentRow) throw new ApiError(500, "db_error", "Payment intent was not created");

  // 2) Ask the provider to start collection. Failures keep the intent pending.
  let providerReference: string | null = null;
  try {
    const result = await provider.initiatePayment({
      amount_minor: amountMinor,
      currency: input.currency,
      reference: String(intentRow.reference ?? ""),
      description: input.description ?? null,
      customer_phone: input.customer_phone ?? null,
      callback_url: input.callback_url ?? null,
      success_url: input.success_url ?? null,
      idempotency_key: input.idempotency_key ?? null,
    });
    providerReference = result.provider_reference ?? null;
  } catch (err) {
    logger.warn("Provider initiation failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    ...(intentRow as unknown as Transaction),
    provider_reference: providerReference,
  };
}