/**
 * Transfer + refund service.
 *
 * Money moves only through SECURITY DEFINER functions invoked with the
 * service-role client; the caller's session is used for authorization checks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, badRequest, conflict } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import { createReference } from "../refs.ts";
import { mapPostgresError } from "./payment-service.ts";
import { assertValidStatusTransition, canRefund } from "../payments/state.ts";
import type { Transaction } from "../types.ts";

export interface TransferInput {
  amountMinor: number;
  currency: string;
  toOwnerType: "user" | "merchant";
  toOwnerId: string;
  idempotencyKey: string;
  description: string | null;
}

/** Move money between two wallets atomically. */
export async function executeTransfer(
  supabase: SupabaseClient,
  fromWalletId: string,
  input: TransferInput
): Promise<Transaction> {
  const admin = requireAdminClient();
  const reference = createReference("ap_txn");
  try {
    const { data, error } = await admin.rpc("execute_transfer", {
      p_from_wallet_id: fromWalletId,
      p_to_owner_type: input.toOwnerType,
      p_to_owner_id: input.toOwnerId,
      p_amount_minor: input.amountMinor,
      p_currency: input.currency,
      p_reference: reference,
      p_idempotency_key: input.idempotencyKey,
      p_description: input.description,
    });
    if (error) mapPostgresError(error);
    return data as unknown as Transaction;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    mapPostgresError(err);
  }
}

export interface RefundResult {
  refund: Record<string, unknown>;
  transaction: Transaction;
  replayed: boolean;
}

export interface RefundInput {
  original: Transaction;
  amountMinor: number;
  actorId: string;
  idempotencyKey: string;
  reason?: string | null;
}

/**
 * Refund a previously succeeded transaction through the server-side
 * `create_refund` RPC. The RPC (not this module) is the authority for:
 *   - ownership authorization (admin, or merchant owner of the receiving wallet)
 *   - cumulative refund cap (refunds can never exceed the original amount)
 *   - idempotency on the caller-supplied idempotency key
 *   - reversal of the ORIGINAL movement so no money is created
 *   - advisory locking so concurrent refunds cannot double-credit.
 */
export async function refundTransaction(input: RefundInput): Promise<RefundResult> {
  const { original, amountMinor, actorId, idempotencyKey, reason } = input;

  if (!canRefund(original.status)) {
    throw conflict("Only succeeded payments can be refunded", "not_refundable");
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw badRequest("Refund amount must be a positive integer of minor units");
  }
  if (amountMinor > original.amount_minor) {
    throw badRequest("Refund amount exceeds the original transaction amount");
  }
  const targetStatus =
    amountMinor >= original.amount_minor ? "refunded" : "partially_refunded";
  assertValidStatusTransition(original.status, targetStatus);

  const admin = requireAdminClient();
  const refundReference = createReference("ap_ref");
  try {
    const { data, error } = await admin.rpc("create_refund", {
      p_txn_reference: original.reference,
      p_amount_minor: amountMinor,
      p_currency: original.currency,
      p_ref_reference: refundReference,
      p_idempotency_key: idempotencyKey,
      p_reason: reason ?? "Refund requested by account holder",
      p_actor: actorId,
    });
    if (error) mapPostgresError(error);

    const body = (data ?? {}) as {
      refund?: Record<string, unknown>;
      transaction?: Record<string, unknown>;
      replayed?: boolean;
    };
    if (!body.refund || !body.transaction) {
      throw new ApiError(500, "db_error", "Refund RPC returned an unexpected result");
    }
    return {
      refund: body.refund,
      transaction: body.transaction as unknown as Transaction,
      replayed: body.replayed === true,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    mapPostgresError(err);
  }
}

/**
 * True when the caller may view/request refunds for a transaction:
 * admins always; otherwise the merchant who owns the wallet that received
 * the funds (the natural refund authority for a collection).
 * Enforcement also happens inside the DB RPC; this is a UX-level pre-check.
 */
export async function canRequestRefund(
  supabase: SupabaseClient,
  role: string,
  receiverWalletId: string | null,
  userId: string
): Promise<boolean> {
  if (role === "admin") return true;
  if (!receiverWalletId) return false;
  const { data, error } = await supabase
    .from("wallets")
    .select("id, merchant:merchants!inner(owner_id)")
    .eq("id", receiverWalletId)
    .single();
  if (error || !data) return false;
  const merchant = data.merchant as { owner_id: string } | { owner_id: string }[];
  const owner = Array.isArray(merchant) ? merchant[0]?.owner_id : merchant?.owner_id;
  return owner === userId;
}