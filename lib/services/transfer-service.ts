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

/** Refund a previously succeeded transaction. */
export async function refundTransaction(
  original: Transaction,
  amountMinor: number,
  actorId: string
): Promise<Transaction> {
  if (!canRefund(original.status)) {
    throw conflict("Only succeeded payments can be refunded", "not_refundable");
  }
  const targetStatus =
    amountMinor >= original.amount_minor ? "refunded" : "partially_refunded";
  assertValidStatusTransition(original.status, targetStatus);

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw badRequest("Refund amount must be a positive integer of minor units");
  }
  if (amountMinor > original.amount_minor) {
    throw badRequest("Refund amount exceeds the original transaction amount");
  }

  const admin = requireAdminClient();
  const refundReference = createReference("ap_ref");
  try {
    const { data, error } = await admin.rpc("apply_refund", {
      p_txn_reference: original.reference,
      p_amount_minor: amountMinor,
      p_currency: original.currency,
      p_ref_reference: refundReference,
      p_reason: "Refund requested by account holder",
      p_actor: actorId,
    });
    if (error) mapPostgresError(error);
    return data as unknown as Transaction;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    mapPostgresError(err);
  }
}