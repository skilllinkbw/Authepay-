/**
 * Pure financial-decision helpers for payments and refunds.
 *
 * Kept free of I/O so the financial invariants are unit-testable without a
 * database. The Postgres SECURITY DEFINER functions remain the enforcement
 * boundary; these helpers mirror (and are consumed by) the same rules.
 */

/**
 * Remaining refundable amount for an original transaction, given the total
 * already refunded. Never negative.
 */
export function refundableAmount(
  originalAmountMinor: number,
  alreadyRefundedMinor: number
): number {
  if (!Number.isSafeInteger(originalAmountMinor) || originalAmountMinor <= 0) return 0;
  const remaining = originalAmountMinor - alreadyRefundedMinor;
  return remaining > 0 ? remaining : 0;
}

/**
 * True when a refund request is within the cumulative cap for the original
 * transaction (refunds can never exceed the original amount).
 */
export function isRefundWithinCap(
  originalAmountMinor: number,
  alreadyRefundedMinor: number,
  refundAmountMinor: number
): boolean {
  return (
    Number.isSafeInteger(refundAmountMinor) &&
    refundAmountMinor > 0 &&
    refundAmountMinor <= refundableAmount(originalAmountMinor, alreadyRefundedMinor)
  );
}

/** The status the original transaction should enter after this refund. */
export function resultingStatusAfterRefund(
  originalAmountMinor: number,
  alreadyRefundedMinor: number,
  refundAmountMinor: number
): "refunded" | "partially_refunded" {
  return refundAmountMinor >= originalAmountMinor - alreadyRefundedMinor
    ? "refunded"
    : "partially_refunded";
}

/**
 * Map a provider-reported payment status to the settlement action:
 *  - succeeded           -> settle the payment intent (credits the wallet once)
 *  - failed / cancelled  -> fail the intent (never touches balances)
 *  - anything else       -> nothing (never fabricates success)
 */
export function settlementActionFor(
  status: string | null
): "settle" | "fail" | null {
  if (status === "succeeded") return "settle";
  if (status === "failed" || status === "cancelled") return "fail";
  return null;
}

/**
 * Map a provider status to the target status for a transaction state machine.
 * Pending never becomes success. Returns null when no transition is valid.
 */
export function providerStatusToTransactionStatus(status: string | null): string | null {
  if (status === "pending") return "processing";
  if (status === "succeeded" || status === "failed" || status === "cancelled") return status;
  return null;
}