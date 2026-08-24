/**
 * Payment provider abstraction.
 *
 * Providers are isolated behind this interface; the rest of the app never
 * talks to a concrete provider directly.
 */

export type ProviderPaymentStatus = "pending" | "processing" | "succeeded" | "failed";

export interface ProviderInitiationInput {
  amount_minor: number;
  currency: string;
  reference: string;
  description?: string | null;
  customer_phone?: string | null;
  callback_url?: string | null;
  success_url?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProviderInitiationResult {
  ok: boolean;
  status: ProviderPaymentStatus;
  provider_reference?: string | null;
  redirect_url?: string | null;
  error_message?: string | null;
}

export interface ProviderWebhookContext {
  rawBody: string;
  signature: string | null;
  headers: Record<string, string | null>;
}

export interface ProviderEventResult {
  /** Stable identifier of the event (used for deduplication). */
  eventId: string;
  eventType: string;
  /** Our transaction reference the event refers to. */
  reference: string | null;
  status: ProviderPaymentStatus | null;
  reason?: string | null;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  initiatePayment(input: ProviderInitiationInput): Promise<ProviderInitiationResult>;
  verifyWebhook(ctx: ProviderWebhookContext): Promise<ProviderEventResult>;
}