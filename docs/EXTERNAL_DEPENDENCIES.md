# AuthePay — External Dependencies

Items that **cannot** be completed through code alone. Nothing in this
repository claims these are done. Each item lists the owner of the action and
the evidence required before the related feature may be enabled.

| # | Dependency | Blocks | Owner | Evidence required |
|---|------------|--------|-------|-------------------|
| 1 | **Credential rotation** — Supabase anon + service-role keys, and the legacy `SECRET-KEY-Authepay8946` variable, were exposed in git history (since purged locally). | Production deploy | Operator | Rotation receipts; new keys only in secret manager / `.env` (git-ignored) |
| 2 | **Remote git history purge** — force-push of the rewritten history so the old `.env` disappears from GitHub. | Public repo hygiene | Operator | `git log --all -- .env` empty on origin; GitHub secret scanning + push protection enabled |
| 3 | **Apply migrations** — `supabase/migrations/001…013` to the production Supabase project. | All backend features | Operator | `supabase db push` output + `\df+` verification of RPC grants |
| 4 | **Payment provider contracts** — Orange Money Botswana / MyZaka / Smega / bank or aggregator (e.g. DPO) sandbox + production credentials. | Live payments | Business + provider | Executed agreement; sandbox end-to-end payment, webhook settlement, and refund evidenced |
| 5 | **Bank of Botswana licensing assessment** — e-money issuance / payment service provision may require authorisation under the National Clearance and Settlement Systems Act, 2003 and the Electronic Payment Services Regulations, 2019. | Live money movement | Business + counsel | Written legal opinion or licence/exemption confirmation |
| 6 | **Independent legal review** — all documents under `legal/` (and `/legal` in-app) are drafts. | Public launch | Botswana-qualified attorney | Signed review memo; `[TO CONFIRM]` placeholders completed |
| 7 | **Commercial pricing sign-off** — plan prices are `null` in `lib/commercial/plans.ts` by design. | Charging customers | Business | Approved pricing schedule; update `price_bwp_minor_per_month` + `tests/commercial.test.ts` in the same commit |
| 8 | **Self-serve billing provider** (invoicing/card charging for subscriptions). Plan changes are currently admin-operated via `/api/admin/subscriptions`. | Automated billing | Engineering | Provider integration + webhook verification tests |
| 9 | **Independent penetration test** of the production deployment. | Bank/partner review | External security firm | Test report with remediation evidence |
| 10 | **Data Protection registration/DPO assessment** — registration with the Information and Data Protection Commission and DPO appointment where required by the Data Protection Act, 2024. | Compliance posture | Business + counsel | Registration certificate / documented assessment |
| 11 | **AML/CFT programme** — FIA, 2022 obligations: risk assessment, CDD/KYC procedures, STR reporting process to the Financial Intelligence Agency. | Live regulated activity | Business + compliance officer | Documented programme + FIA registration where applicable |
| 12 | **Browser/mobile accessibility & UX audit** — no browser automation was available during engineering verification. | Public launch | QA | Recorded browser test run on the supported device matrix |

## Process rule

A feature gated by any row above must remain disabled, in test mode, or
clearly labelled in the UI until the evidence exists. Do not fabricate
completion.
