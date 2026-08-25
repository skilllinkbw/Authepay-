/**
 * Webhook engine.
 *
 * Inbound provider events are verified against the provider's signature,
 * stored once for idempotency/replay-protection, then reconciled into the
 * transaction state machine. Outbound merchant notifications are signed.
 */

import { ApiError } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import { logger } from "../logger.ts";
import { defaultProvider } from "../providers/registry.ts";
import type { ProviderEventResult, ProviderPaymentStatus } from "../providers/types.ts";

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

  // 3. Reconcile the referenced transaction, when present.
  const status = event.status;
  if (event.reference && status && ["succeeded", "failed", "cancelled", "pending"].includes(status)) {
    // Providers may report transitions from any state, so we don't enforce a
    // from_status check during reconciliation.
    try {
      const { error } = await admin.rpc("update_transaction_status", {
        p_reference: event.reference,
        p_from_status: null,
        p_to_status: status === "pending" ? "processing" : status,
        p_reason: `provider_event:${event.eventType}`,
        p_actor: `provider:${provider.name}`,
      });
      if (error) {
        const message = error.message ?? "";
        if (/unexpected_state/.test(message)) {
          // Concurrent/duplicate transition — treat as benign but auditable.
          logger.warn("Ignoring out-of-order provider event", {
            reference: event.reference,
            eventType: event.eventType,
          });
        } else if (/transaction_not_found/.test(message)) {
          logger.warn("Provider event references unknown transaction", {
            reference: event.reference,
          });
        } else {
          throw new ApiError(500, "db_error", "Reconciliation failed");
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "db_error", "Reconciliation failed");
    }
  }

  // Mark processed so retries do not redo reconciliation work.
  await admin
    .from("provider_webhook_events")
    .update({ processed: true })
    .match({ provider: provider.name, event_id: event.eventId });

  return {
    duplicate: false,
    eventId: event.eventId,
    reference: event.reference,
    status: event.status,
  };
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