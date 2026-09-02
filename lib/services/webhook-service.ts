/**
 * Webhook engine.
 *
 * Inbound provider events are verified against the provider's signature,
 * stored once for idempotency/replay-protection, then reconciled into the
 * transaction state machine. Outbound merchant notifications are signed.
 */

import { ApiError } from "../errors.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminClient } from "../supabase/admin.ts";
import { logger } from "../logger.ts";
import { defaultProvider } from "../providers/registry.ts";
import type {
  PaymentProvider,
  ProviderEventResult,
  ProviderPaymentStatus,
} from "../providers/types.ts";

export interface InboundEventOutcome {
  duplicate: boolean;
  eventId: string;
  reference: string | null;
  status: ProviderPaymentStatus | null;
}

/** Process a single inbound provider webhook event. */
export async function processInboundEvent(
  rawBody: string,
  signature: string | null
): Promise<InboundEventOutcome> {
  const admin = requireAdminClient();
  const provider = defaultProvider();

  // 1. Verify the event with the provider-specific scheme. Never trust payload.
  let event: ProviderEventResult;
  try {
    event = await provider.verifyWebhook({
      rawBody,
      signature,
      headers: {},
    });
  } catch (err) {
    throw new ApiError(
      400,
      "invalid_webhook",
      "Webhook verification failed: " + (err instanceof Error ? err.message : "unknown")
    );
  }

  // 2. Store the event once — unique(provider,event_id) gives replay safety.
  let inserted = false;
  try {
    const { error } = await admin.from("provider_webhook_events").insert({
      provider: provider.name,
      event_id: event.eventId,
      event_type: event.eventType,
      raw_payload: JSON.parse(rawBody),
    });
    if (!error) inserted = true;
  } catch (err) {
    logger.error("Failed to persist webhook event", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw new ApiError(500, "db_error", "Could not record webhook event");
  }

  if (!inserted) {
    return { duplicate: true, eventId: event.eventId, reference: event.reference, status: event.status };
  }

  // 3. Reconcile the referenced payment, when present. Events reference payment
  //    intents; settlement/failure always run through the SQL settlement RPCs
  //    so balances can only change via the ledger functions. Unknown references
  //    (legacy transaction references) fall back to the guarded transaction
  //    state machine.
  const status = event.status;
  if (event.reference && status && ["succeeded", "failed", "cancelled", "pending"].includes(status)) {
    await reconcileProviderEvent(admin, provider, event, status);
  }

  // 4. Mark processed so retries do not redo reconciliation work.
  await markProcessed(admin, provider, event.eventId);

  return {
    duplicate: false,
    eventId: event.eventId,
    reference: event.reference,
    status: event.status,
  };
}

/**
 * Reconcile an inbound provider event into our state.
 *
 * Rules:
 *  - succeeded  -> settle_payment_intent  (credits the wallet exactly once)
 *  - failed/cancelled -> fail_payment_intent (never touches balances)
 *  - pending    -> guarded transition to processing (never success)
 *  - unknown intent references fall back to the guarded transaction state
 *    machine for legacy/direct transaction references.
 *  - Out-of-order / terminal-state redeliveries are logged and ignored.
 *  - Errors are raised as typed ApiErrors; no unknown exception escapes.
 */
async function reconcileProviderEvent(
  admin: SupabaseClient,
  provider: PaymentProvider,
  event: ProviderEventResult,
  status: ProviderPaymentStatus
): Promise<void> {
  try {
    if (status === "succeeded") {
      const { error } = await admin.rpc("settle_payment_intent", {
        p_intent_reference: event.reference,
        p_provider_reference: null,
        p_actor: `provider:${provider.name}`,
      });
      if (!error) return;
      const msg = error.message ?? "";
      if (/intent_not_found/.test(msg)) {
        return fallbackTransactionTransition(admin, provider, event, status);
      }
      if (/intent_not_settleable/.test(msg)) {
        logger.warn("Provider event for terminal intent ignored", {
          reference: event.reference,
          eventType: event.eventType,
        });
        return;
      }
      throw new ApiError(500, "db_error", "Reconciliation failed");
    }

    if (status === "failed") {
      const { error } = await admin.rpc("fail_payment_intent", {
        p_intent_reference: event.reference,
        p_reason: `provider_event:${event.eventType}`,
        p_actor: `provider:${provider.name}`,
      });
      if (!error) return;
      const msg = error.message ?? "";
      if (/intent_not_found/.test(msg)) {
        return fallbackTransactionTransition(admin, provider, event, status);
      }
      throw new ApiError(500, "db_error", "Reconciliation failed");
    }

    // pending: only ever advances an intent/transaction to processing.
    return fallbackTransactionTransition(admin, provider, event, "pending");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, "db_error", "Reconciliation failed");
  }
}

/**
 * Guarded fallback for references that are transactions rather than intents.
 * Never transitions a terminal state; out-of-order events are benign no-ops.
 */
async function fallbackTransactionTransition(
  admin: SupabaseClient,
  provider: PaymentProvider,
  event: ProviderEventResult,
  status: ProviderPaymentStatus
): Promise<void> {
  const { error } = await admin.rpc("update_transaction_status", {
    p_reference: event.reference,
    p_from_status: null,
    p_to_status: status === "pending" ? "processing" : status,
    p_reason: `provider_event:${event.eventType}`,
    p_actor: `provider:${provider.name}`,
  });
  if (!error) return;
  const msg = error.message ?? "";
  if (/unexpected_state|invalid_transition/.test(msg)) {
    logger.warn("Out-of-order provider event ignored", {
      reference: event.reference,
      eventType: event.eventType,
    });
    return;
  }
  if (/transaction_not_found|intent_not_found/.test(msg)) {
    logger.warn("Provider event references unknown payment", {
      reference: event.reference,
    });
    return;
  }
  throw new ApiError(500, "db_error", "Reconciliation failed");
}

/** Mark an event row processed (idempotent). */
async function markProcessed(
  admin: SupabaseClient,
  provider: PaymentProvider,
  eventId: string
): Promise<void> {
  await admin
    .from("provider_webhook_events")
    .update({ processed: true })
    .match({ provider: provider.name, event_id: eventId });
}

/**
 * Deliver an outbound webhook to a stored endpoint, recording the attempt.
 * Delivery failures are recorded (never thrown) so payment flow is unaffected.
 */
export async function deliverOutbound(
  endpointId: string,
  endpointUrl: string,
  endpointSecret: string,
  eventType: string,
  data: Record<string, unknown>
): Promise<"delivered" | "failed"> {
  const admin = requireAdminClient();
  const { buildPayload, signPayload } = await import("../webhooks/outbound.ts");
  const payload = buildPayload(crypto.randomUUID(), eventType, data);
  const signature = signPayload(endpointSecret, payload);

  const { data: row, error } = await admin
    .from("webhook_deliveries")
    .insert({
      endpoint_id: endpointId,
      event_type: eventType,
      payload,
      signature,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !row) {
    logger.error("Failed to queue webhook delivery", {
      message: error?.message ?? "no row",
    });
    return "failed";
  }
  const deliveryId = String(row.id);

  try {
    const res = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-authepay-signature": signature,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    const delivered = res.ok;
    await admin
      .from("webhook_deliveries")
      .update({ status: delivered ? "delivered" : "failed", response_status: res.status })
      .eq("id", deliveryId);
    return delivered ? "delivered" : "failed";
  } catch (err) {
    logger.warn("Webhook delivery failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    await admin
      .from("webhook_deliveries")
      .update({ status: "failed" })
      .eq("id", deliveryId);
    return "failed";
  }
}