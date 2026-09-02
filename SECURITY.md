# Security Notes

## Exposed credentials incident (development environment)

A `.env` file containing Supabase project URLs and anon keys was committed to
git history early in this repository's life (original commit `5023c44`).

Treat everything that was in that file as **compromised**:

1. Rotate the Supabase anon key (Project Settings -> API -> Rotate keys).
2. If any service-role key was ever present in `.env`, rotate it immediately -
   that key bypasses Row Level Security.
3. Prefer creating a fresh Supabase project if key hygiene cannot be verified.
4. Never re-add real values to any tracked file. Use `.env` (git-ignored) or
   your hosting provider's secret store.

**History remediation status:** `.env` has been removed from the entire
repository history. All branches were rewritten with `git filter-branch`
(index-filter removing `.env`), the `refs/original/*` backup refs were deleted,
reflogs were expired, and `git gc --prune=now` physically removed the old
objects. Verified evidence: `git log --all -- .env` returns no commits and
`git cat-file -t 5023c44` fails (object pruned).

**Still required externally:**

- Rotation (steps 1-2) remains mandatory - objects may persist in local clones,
  forks, and the remote `origin` until it is force-pushed with the rewritten
  history. A **force push is required** and must be coordinated with
  collaborators; GitHub secret scanning / push protection should be enabled on
  the repository (Settings -> Code security) before the push.
- Any other clone of this repository still holds the old objects and must be
  re-cloned after the force push.

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
