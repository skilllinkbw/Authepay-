/**
 * Outbound webhook payloads and signing.
 */

import { createHmac } from "node:crypto";

export interface OutboundWebhookPayload {
  id: string;
  type: string;
  created_at: string;
  data: Record<string, unknown>;
}

export function buildPayload(
  eventId: string,
  eventType: string,
  data: Record<string, unknown>,
  now = new Date()
): OutboundWebhookPayload {
  return {
    id: eventId,
    type: eventType,
    created_at: now.toISOString(),
    data,
  };
}

export function signPayload(secret: string, payload: OutboundWebhookPayload): string {
  const raw = JSON.stringify(payload);
  return "sha256=" + createHmac("sha256", secret).update(raw, "utf8").digest("hex");
}

/** Backoff schedule (seconds) for failed deliveries. */
export const RETRY_SCHEDULE_SECONDS = [60, 300, 900, 3600, 21600] as const;

export function nextRetryDelaySeconds(attemptCount: number): number | null {
  if (attemptCount >= RETRY_SCHEDULE_SECONDS.length) return null;
  return RETRY_SCHEDULE_SECONDS[attemptCount];
}