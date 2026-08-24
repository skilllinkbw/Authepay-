# Security Notes

## Exposed credentials incident (development environment)

A `.env` file containing Supabase project URLs and anon keys was committed to
git history at some point in this repository's past (`git show HEAD:.env`).

Treat everything that was in that file as **compromised**:

1. Rotate the Supabase anon key (Project Settings -> API -> Rotate keys).
2. If any service-role key was ever present in `.env`, rotate it immediately -
   that key bypasses Row Level Security.
3. Prefer creating a fresh Supabase project if key hygiene cannot be verified.
4. Never re-add real values to any tracked file. Use `.env` (git-ignored) or
   your hosting provider's secret store.

`.env` has been removed from the git index while keeping the local file on
disk. Note: removing it from HEAD does not scrub history - rotation above is
still required.

## Reporting

Do not open public issues for security reports. Contact the maintainers
directly.

## Hardening implemented

- Money stored as integer minor units; no floating point anywhere near money.
- All balance mutations via atomic SECURITY DEFINER functions with wallet row
  locks and an append-only ledger (`ledger_entries` unique on
  `(reference, wallet_id)`).
- RLS on every table; admin checks via security-definer `is_admin()`.
- Idempotency keys required on money-moving endpoints; replay returns the
  original transaction.
- Provider webhooks are signature verified, stored once for deduplication,
  and never trusted as raw client input.
- API keys hashed (SHA-256), shown once, revocable, prefix-identifiable.
- Structured logging redacts secrets (`lib/logger.ts`); passwords/tokens are
  never logged.
- Strict JSON body limits, content-type enforcement, security headers in
  `next.config.js`.
