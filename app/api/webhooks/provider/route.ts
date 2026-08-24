import { fail, ok } from "@/lib/server/api";
import { processInboundEvent } from "@/lib/services/webhook-service";
import { writeAudit } from "@/lib/services/audit-service";
import { signatureFromHeaders } from "@/lib/webhooks/verify";
import { badRequest } from "@/lib/errors";
import { logger } from "@/lib/logger";

const MAX_WEBHOOK_BODY_BYTES = 262_144; // 256 KB

/**
 * POST /api/webhooks/provider — inbound provider events.
 * Signature-verified, idempotent, replay-protected. Never trusts payload data.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw badRequest("Expected an application/json body", "unsupported_media_type");
    }
    const buf = await request.arrayBuffer();
    if (buf.byteLength > MAX_WEBHOOK_BODY_BYTES) {
      throw badRequest("Webhook body too large", "payload_too_large");
    }
    const rawBody = new TextDecoder().decode(buf);
    const signature = signatureFromHeaders((n) => request.headers.get(n));

    const outcome = await processInboundEvent(rawBody, signature);

    await writeAudit({
      actorUserId: null,
      action: outcome.duplicate ? "webhook.duplicate_ignored" : "webhook.processed",
      entityType: "provider_event",
      entityId: outcome.eventId,
      metadata: { reference: outcome.reference, status: outcome.status },
    });

    return ok({ received: true, duplicate: outcome.duplicate });
  } catch (err) {
    logger.warn("Inbound webhook rejected", {
      message: err instanceof Error ? err.message : String(err),
    });
    return fail(err);
  }
}