# AuthePay — Deployment & Release Guide

## Environments

| Environment | Purpose | Payment provider |
|---|---|---|
| Local dev | Engineering | `PAYMENT_PROVIDER=test`, `PAYMENT_TEST_MODE=true` |
| Staging | Partner/provider sandbox testing | Provider sandbox credentials |
| Production | Customers | Live provider credentials (external dependency #4) |

## Build & release (reproducible)

```bash
npm ci                  # lockfile-pinned install
npm run typecheck       # tsc --noEmit
npm run lint            # eslint --max-warnings 0
npm test                # unit + contract suites
npm run build           # webpack production build (standalone output)
npm run opennext        # Cloudflare Pages bundle (alternative target)
```

The build is reproducible from a clean checkout: same lockfile + Node >= 20.9
(see `.nvmrc`) produces the same route set. There are no mobile artifacts and
no code-signing keys in this repository; if a signed desktop/mobile wrapper is
introduced later, signing credentials must live in the CI secret store and
never in the repo.

## Database

```bash
supabase link --project-ref <ref>
supabase db push        # applies supabase/migrations/001…013
```

Migrations are idempotent. After applying, verify:

- `\df+ public.settle_payment_intent` etc. show EXECUTE granted to
  `service_role` only (contract tests in `tests/migrations-contract.test.ts`
  assert the SQL ships these grants).
- `select * from pg_policies where tablename in ('profiles','subscriptions','policy_acceptances');`

## Required environment variables

See `.envexample`. Server-only: `SUPABASE_SERVICE_ROLE_KEY`,
`PAYMENT_PROVIDER`, `PAYMENT_TEST_MODE` (must be `false` in production once a
real provider is configured). Never commit `.env`.

## Production checklist

1. External dependencies #1–#5 in `docs/EXTERNAL_DEPENDENCIES.md` evidenced.
2. `PAYMENT_TEST_MODE=false` and a real provider selected.
3. `NEXT_PUBLIC_APP_URL` set to the production origin (drives metadata).
4. Edge rate limiting + WAF rules enabled on the deployment platform.
5. Security headers verified live (`/api/health` plus a header probe).
6. Backups and PITR enabled on the Supabase project.
7. Monitoring on `audit_logs` growth and webhook delivery failures.

## Rollback

`output: "standalone"` builds are immutable per commit; redeploy the previous
commit. Database migrations are additive — never hand-edit applied migrations;
ship a new forward migration instead.
