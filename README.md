# AuthePay BW

Production-oriented payments infrastructure for Botswana, built on Next.js
(App Router) + Supabase (Postgres) and deployable to Cloudflare Pages via
OpenNext.

## Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | Next.js 16 App Router, React 18, Tailwind    |
| Backend    | Next.js route handlers (`app/api/**`)         |
| Database   | Supabase Postgres (RLS + SECURITY DEFINER RPC) |
| Auth       | Supabase Auth (SSR cookie sessions)          |
| Deploys    | Cloudflare Pages (`@opennextjs/cloudflare`) or Node `standalone` |

## Commands

```bash
npm install          # install dependencies
npm run dev          # webpack dev server (Turbopack unsupported in this toolchain)
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # unit tests for money/state/keys/webhook logic
```

## Architecture

- **Money is integer minor units** (`*_minor bigint`) everywhere - no floats.
- **Balances only change server-side** through atomic SECURITY DEFINER
  Postgres functions (`execute_transfer`, `apply_credit`, `apply_debit`,
  `apply_refund`) that write an immutable ledger entry per movement and lock
  the wallet row. The browser has no write path to balances.
- **Row Level Security** restricts every read to rows the caller owns; admin
  visibility flows through a security-definer `is_admin()` check.
- **Idempotency**: transfers/payments require an `Idempotency-Key` header;
  uniqueness is enforced by unique constraints, replays return the original
  transaction instead of duplicating it.
- **Webhooks**: inbound provider events are signature-verified, stored once
  (`provider_webhook_events` unique on `(provider,event_id)` = replay
  protection), then reconciled through the transaction state machine.
- **API keys** are generated as `apk_...` secrets shown once; only SHA-256
  hashes are stored, with prefixes for identification and revocation support.
- **Providers** sit behind `lib/providers/types.ts`. The `test` provider is
  isolated behind `PAYMENT_TEST_MODE=true` and never fabricates success;
  Orange Money BW / MyZaka / Smega / bank adapters refuse to run until their
  credentials exist in the server environment.

## Environment variables

Copy `.envexample` to `.env` and fill in real values. `.env` is git-ignored -
never commit secrets. Server-only values:

- `SUPABASE_SERVICE_ROLE_KEY` - required by financial API routes (server side).
- `PAYMENT_PROVIDER`, `PAYMENT_TEST_MODE` - active provider selection.

## Database migrations

Apply with the Supabase CLI against your project:

```bash
supabase db push        # or: supabase migration up
```

Migrations live in `supabase/migrations/` (extensions -> tables -> RLS ->
functions/triggers). They are idempotent (`create ... if not exists`) and safe
to re-run.

## Security notes

- Passwords/tokens/secrets are never logged (`lib/logger.ts` redacts).
- Payment status is never accepted from the client - only provider webhooks
  (verified server-side) can settle a transaction.
- Security headers (HSTS, nosniff, DENY framing, strict referrer) are set in
  `next.config.js`.