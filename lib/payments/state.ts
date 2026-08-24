/**
 * Payment/transaction state machines.
 *
 * These transitions are pure and unit-tested. Persistence/RPC is applied
 * separately by the service layer.
 */

import { InvalidStateTransitionError } from "../errors.ts";
import type { PaymentStatus, PaymentType } from "../types.ts";

// -- Payment status transitions --------------------------------

export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["processing", "succeeded", "failed", "cancelled"],
  processing: ["succeeded", "failed", "cancelled"],
  succeeded: ["refunded", "partially_refunded"],
  failed: ["cancelled"],
  cancelled: [],
  refunded: [],
  partially_refunded: ["refunded"],
};

export function assertValidStatusTransition(from: PaymentStatus, to: PaymentStatus): void {
  const allowed = PAYMENT_STATUS_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

/** Whether this type moves money out of a wallet (debit) or into it (credit). */
export function directionForType(type: PaymentType): "debit" | "credit" {
  switch (type) {
    case "deposit":
    case "topup":
    case "refund":
      return "credit";
    case "withdrawal":
    case "payment":
    case "transfer":
      return "debit";
  }
}

/** A payment/transfer can be retried with the same idempotency key. */
export function isRetryableStatus(status: PaymentStatus): boolean {
  return status === "failed" || status === "cancelled";
}

/** A refund is permissible only from these states. */
export function canRefund(status: PaymentStatus): boolean {
  return status === "succeeded" || status === "partially_refunded";
}