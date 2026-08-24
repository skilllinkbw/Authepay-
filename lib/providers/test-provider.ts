/**
 * Test provider.
 *
 * Clearly isolated sandbox integration used when PAYMENT_TEST_MODE=true.
 * It never fabricates success: payments stay "pending" until an explicit
 * simulation event is posted to the webhook endpoint, which is only enabled
 * while test mode is on. In production this provider must be disabled.
 */

import type {
  PaymentProvider,
  ProviderEventResult,
  ProviderInitiationInput,
  ProviderInitiationResult,
  ProviderWebhookContext,
} from "./types.ts";

export const TEST_PROVIDER_NAME = "test";

export function isTestModeEnabled(): boolean {
  return process.env.PAYMENT_TEST_MODE === "true";
}

export class TestProvider implements PaymentProvider {
  readonly name = TEST_PROVIDER_NAME;
  readonly isConfigured = true;

  async initiatePayment(input: ProviderInitiationInput): Promise<ProviderInitiationResult> {
    if (!isTestModeEnabled()) {
      return {
        ok: false,
        status: "failed",
        error_message: "Test provider is disabled (set PAYMENT_TEST_MODE=true).",
      };
    }
    // Sandbox: no real money movement happens here. The intent stays pending
    // until a simulated webhook event confirms or fails it.
    return {
      ok: true,
      status: "pending",
      provider_reference: "test_" + input.reference.toLowerCase(),
      redirect_url: null,
    };
  }

  async verifyWebhook(ctx: ProviderWebhookContext): Promise<ProviderEventResult> {
    if (!isTestModeEnabled()) {
      throw new Error("Test webhook events are only accepted in PAYMENT_TEST_MODE");
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(ctx.rawBody) as Record<string, unknown>;
    } catch {
      throw new Error("Malformed JSON payload");
    }

    const eventId = typeof payload.event_id === "string" ? payload.event_id : "";
    if (!eventId) throw new Error("Missing event_id");

    const eventType = typeof payload.event_type === "string" ? payload.event_type : "unknown";
    const reference = typeof payload.reference === "string" ? payload.reference : null;

    let status: ProviderEventResult["status"] = null;
    if (eventType === "payment.succeeded") status = "succeeded";
    else if (eventType === "payment.failed") status = "failed";
    else if (eventType === "payment.pending") status = "pending";

    return { eventId, eventType, reference, status };
  }
}