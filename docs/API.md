# AuthePay API Reference

Base URL: your deployment origin. All endpoints are JSON over HTTPS.
Errors are structured: `{ "error": { "code": string, "message": string } }`.

## Authentication

Browser clients authenticate with the Supabase session cookie (set at login).
Every endpoint below requires an authenticated session unless marked public.
Authorization is enforced server-side per request; roles are canonicalised
from the `profiles` table, never trusted from the JWT.

## Idempotency

Money-moving POST endpoints require an `Idempotency-Key` header. Replays
return the original transaction instead of duplicating financial effects.

## Endpoints

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/health` | public | Liveness + boolean configuration report (no secret values). 200 when core config present, else 503. |
| `POST /api/auth/signout` | session | Ends the session. |
| `GET /api/profile` · `PATCH /api/profile` | session | Read/update own profile (name, phone). Role changes are admin-only. |
| `GET /api/wallet` | session | Own wallet + balance. |
| `GET /api/transactions` | session | Own transactions, paginated (`limit`, `offset`). |
| `POST /api/transfers` | session + idempotency | Wallet-to-wallet transfer. Recipient resolved by email/phone server-side. Blocked for suspended/cancelled/expired accounts. |
| `GET /api/payments` · `POST /api/payments` | session + idempotency (POST) | List/initiate payment intents. Status is set only by verified provider webhooks. Enforces subscription status + plan volume cap. |
| `GET /api/payments/[reference]` | session | Poll a payment's real status. |
| `POST /api/payments/[reference]/refund` | session | Refund against the original payment; cumulative cap ≤ original amount; authorized to admin or receiving merchant (checked in API and again in the RPC). |
| `GET /api/merchants` · `POST /api/merchants` · `PATCH /api/merchants` | session | Merchant CRUD for owned merchants. Creation requires an account in good standing. |
| `GET /api/api-keys` · `POST /api/api-keys` | session | List/create API keys. Plaintext key returned exactly once; only SHA-256 hashes are stored. Creation enforces the plan's active-key limit. |
| `DELETE /api/api-keys/[id]` | session | Revoke own key. |
| `GET /api/billing` | session | Subscription state, plan entitlements, and usage (active keys, monthly volume). |
| `GET /api/legal/acceptance` · `POST /api/legal/acceptance` | session | Read/record legal policy acceptance. Versions validated server-side against `lib/legal/policies.ts`; records are append-only. |
| `GET /api/notifications` | session | Own notifications. |
| `POST /api/webhooks/provider` | signature | Inbound provider events. HMAC signature verification, replay window, dedup on `(provider, event_id)`, then state-machine reconciliation. |
| `GET /api/admin/users` · `PATCH /api/admin/users` | admin | User listing and role changes (re-checked inside the RPC). |
| `GET /api/admin/audit-logs` | admin | Audit trail. |
| `GET /api/admin/subscriptions` · `PATCH /api/admin/subscriptions` | admin | Commercial state management (re-checked inside the RPC). |

## Legal documents (public)

`GET /legal` and `GET /legal/[slug]` render the current policy documents
(terms, privacy, acceptable use, merchant terms, API terms, cookie policy,
data processing addendum). Markdown copies for partners are generated from
the same source via `npm run export:legal` into `legal/`.

## Rate and payload limits

JSON bodies are capped at 1 MB with strict content-type enforcement.
Per-plan API rate limits are enforced at the commercial layer (see
`lib/commercial/plans.ts`); network-level rate limiting should additionally
be configured at the deployment edge (Cloudflare) — see DEPLOYMENT.md.
