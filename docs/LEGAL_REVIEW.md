# Legal Review Pack — AuthePay (Botswana)

Prepared for a Botswana-qualified attorney. **Nothing here has been reviewed
or approved by counsel.** All documents are drafts (`1.0-draft`).

## Documents to review

Generated from `lib/legal/policies.ts` (single source of truth) into `legal/`:

1. `legal/terms-of-service.md`
2. `legal/privacy-policy.md`
3. `legal/acceptable-use.md`
4. `legal/cookie-policy.md`
5. `legal/merchant-terms.md`
6. `legal/api-terms.md`
7. `legal/data-processing-addendum.md`

## Placeholders to complete

- `[TO CONFIRM: registered legal entity name, company registration number, and registered address]`
- `[TO CONFIRM: privacy contact email]`
- Support contact email (referenced on the billing page)

## Botswana statutes referenced (verify current text)

| Statute | Relevance |
|---|---|
| Data Protection Act, 2024 (Act No. 18 of 2024) | Controller/processor duties, data-subject rights, 72-hour breach notification to the Information and Data Protection Commission, cross-border transfer rules, DPO/DPIA triggers |
| Financial Intelligence Act, 2022 | KYC/KYB, record retention (≥5 years), STR reporting to the Financial Intelligence Agency |
| National Clearance and Settlement Systems Act, 2003 + Electronic Payment Services Regulations, 2019 | Bank of Botswana oversight/licensing of payment service providers and e-money issuance |
| Electronic Communications and Transactions Act, 2014 | Validity of electronic contracts/records, e-commerce disclosures |
| Consumer Protection Act, 2018 | Non-excludable consumer rights, refund fairness |
| Cybercrime and Computer Related Crimes Act, 2018 | Platform-abuse offences referenced in the AUP |

## Technical controls already implemented (for context)

- Policy acceptance is recorded server-side, append-only, with user id,
  policy id, exact version, timestamp, IP, and user agent
  (`policy_acceptances`, migration 012). Users cannot proceed past the
  dashboard gate without accepting the current Terms + Privacy versions.
- Version bumps to any policy automatically re-trigger acceptance.
- Test-mode payments are technically isolated and labelled; no live money
  movement is possible until provider credentials exist.

## Questions for counsel

1. Does the planned operating model require Bank of Botswana authorisation,
   or is operation under partner providers' licences sufficient?
2. Is registration with the Information and Data Protection Commission
   required at launch volumes, and is a DPO triggered?
3. Are the retention periods in the Privacy Policy aligned with FIA 2022 and
   tax law?
4. Are cross-border hosting arrangements (Supabase region) adequately
   safeguarded under the DPA 2024 transfer provisions?
