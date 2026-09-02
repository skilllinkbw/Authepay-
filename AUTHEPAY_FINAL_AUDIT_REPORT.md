# AUTHEPAY — FINAL AUDIT REPORT (Post-Remediation Re-Audit)

Date: 2026-09-02 · Branch: `main`

This report re-audits the repository after the remediation program. Every status below is backed by evidence actually produced in this session (test runs, source reads, git commands, production build, live server probes). Nothing was marked fixed without evidence.

## Evidence produced this session

| Check | Command / method | Result |
|---|---|---|
| Unit + regression suite | `npm test` (money, refs, idempotency, api-keys, payments-state, webhooks, settlement, payment-errors, migrations-contract) | **44/44 pass** |
| Logger suite (orphaned from `npm test`) | `node --test tests/logger.test.ts` | Pass (9 tests, ran pre-remediation; suite unchanged) |
| Typecheck | `npm run typecheck` | 0 errors |
| Lint | `npm run lint` (`eslint . --max-warnings 0`) | 0 problems |
| Production build | `npm run build` | Compiled successfully; 31 routes emitted incl. all new pages/APIs |
| Live prod-server probes | booted build, curl probes | `/` 200 · `/api/payments` GET/POST 401 typed JSON · refund POST 401 · protected pages 307 → login · public pages 200 · unknown 404 |
| Git-history secret purge | `filter-branch` + ref deletion + `gc --prune=now` | `git log --all -- .env` → empty; `git cat-file -t 5023c44` → object pruned |
| RLS/financial migration integrity | `tests/migrations-contract.test.ts` | 6/6 contract assertions pass |

## Remediation ledger — Issue | Previous Status | Fix | Test/Evidence | Current Status

### Security

| Issue | Previous | Fix | Test/Evidence | Current |
|---|---|---|---|---|
| **S-01** Secrets (`.env` with Supabase URL/anon key/`SECRET-KEY-…`) in history commit `5023c44` | FAIL | History rewrite: `git filter-branch --index-filter` removing `.env` from all branches; deleted 18 `refs/original/*` backup refs; `reflog expire --expire=now --all`; `git gc --prune=now`. `.gitignore` covers `.env*`. `.envexample` contains placeholders only. `SECURITY.md` documents required external rotation + force-push. | `git log --all -- .env` returns **no commits**; `git show HEAD:.env` and `git show 1827256:.env` both fail; `git cat-file -t 5023c44` → *object gone*; new test asserts migrations contain no literal secrets | **PASS (local) / BLOCKED (remote)** — rotation + force-push remain external |
| **S-02** `profiles_update` RLS let users set own `role` to admin | FAIL | `010_security_hardening.sql`: role changes restricted to admin security-definer workflow; column-restricted update policy | Test: “migration 010 protects profiles.role from self-escalation (S-02)” passes; admin page relies on server API | **PASS (code) / BLOCKED (live DB apply)** |
| **S-03** Client-writable `api_keys` rows | FAIL | Migration 010 removes client UPDATE on `api_keys`; revocation via admin client only | Test: “migration 010 removes client UPDATE on api_keys (S-03)” passes | **PASS (code)** |
| Money RPCs executable by PUBLIC | FAIL | Migration 011 revokes PUBLIC execute on money RPCs; access via server role only | Test: “migration 011 revokes PUBLIC execution on money RPCs” passes | **PASS (code)** |

### Financial integrity

| Issue | Previous | Fix | Test/Evidence | Current |
|---|---|---|---|---|
| **S-05/F-02/F-03** Refunds credited depositor/sender wallets, no ownership check, double-credit risk | FAIL | New `create_refund` SECURITY DEFINER RPC (`010`): authoritative ownership check (admin or merchant owner of receiving wallet), cumulative-refund cap, reversal of the **original** ledger movement (no money creation), advisory locking, idempotency key dedupe, immutable refund ledger rows. API route adds `canRequestRefund` pre-check and derived idempotency key. | Tests: “migration 010 creates the refunds ledger + create_refund RPC”; settlement tests cap refundable amount and reject exceeding it; payments-state test “refunds only apply to succeeded payments” | **PASS (code) / BLOCKED (live DB)** |
| **F-01** Payment pipeline stopped after provider initiation — no transaction/ledger/balance/webhook settlement | FAIL | `lib/payments/settlement.ts` + webhook-service completion path: provider result → signature-verified webhook → state-machine `assertValidStatusTransition` → atomic double-entry ledger + balance via RPC; pending never settles; provider responses can never write balances directly | Tests: “settlement action maps succeeded to settle”, “never maps pending or unknown to success”, “provider pending maps to processing, never succeeded”, “money cannot reappear after failure”, “terminal states reject further transitions” — all pass | **PASS (code) / BLOCKED (live provider)** |
| Duplicate payments / replay | PASS (transfers) | Payment creation also keyed by `Idempotency-Key`; webhook events stored once for dedupe; replay window enforced | idempotency + webhooks tests pass | **PASS (code)** |


### Frontend (details in `AUTHEPAY_FRONTEND_FINAL_VERIFICATION.md`)

| Issue | Previous | Fix | Test/Evidence | Current |
|---|---|---|---|---|
| FE-01 wrong transaction direction | FAIL | Direction from both wallet IDs (`transactions/page.tsx:46`) | Source + unit test | **PASS** |
| FE-02 totals from last 5 rows | FAIL | Aggregates full `ledger_entries` (`dashboard/page.tsx:29–46`) | Source | **PASS** |
| FE-05 send idempotency key never rotated | FAIL | Correct rotation semantics in `send` + `checkout` | Source | **PASS** |
| FE-06 dead landing CTAs | FAIL | Real Links to `/signup`, `/dashboard` | Source + live probes | **PASS** |
| FE-08 silent mutation failures | FAIL | `res.ok` checked, errors rendered | Source | **PASS** |
| No checkout / payment-status / settings / reset pages | NOT IMPLEMENTED | 6 pages + `/api/profile` added | Build route list; live probes | **PASS** |
| FE-03/FE-04/FE-07 (minor a11y/labels) | PARTIAL | Labelled inputs, semantic buttons, error banners throughout new pages | Source review | **PASS (code) / BLOCKED (browser audit)** |

## Remaining BLOCKED items (external, not code)

1. **Supabase credentials**: none available — migrations 010/011 exist but are **not applied to any live database**; RLS/RPC behavior is contract-tested, not live-verified.
2. **Payment provider**: no sandbox/live credentials — provider integrations run only via the deterministic test adapter (`PAYMENT_TEST_MODE=true`); no real settlement was performed or fabricated.
3. **Browser/mobile/a11y visual audit**: no browser automation available.
4. **Secret rotation + force-push**: Supabase anon/service-role keys must be rotated and rewritten history force-pushed with GitHub push protection enabled (documented in `SECURITY.md`). Old objects persist in any other clone/fork/remote until then.

## Final verdict

**READY WITH CONDITIONS.** No known CRITICAL financial, authorization, or payment-settlement defect remains in the codebase: privilege escalation is closed at the DB layer, refunds can no longer create money or bypass ownership, the payment pipeline settles only through verified webhooks and the state machine, history secrets are purged locally, and the frontend is complete against the real API. Release is conditional on: (1) applying migrations 010/011 to the production Supabase and re-running the contract tests against it, (2) rotating the exposed Supabase credentials and force-pushing the rewritten history, (3) live verification of one real provider payment (currently BLOCKED), and (4) a browser-level responsive/a11y pass. Automated tests passing does not by itself establish bank-grade readiness; live verification of the blocked items does.
