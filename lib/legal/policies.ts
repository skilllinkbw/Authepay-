/**
 * AuthePay legal policy registry — single source of truth.
 *
 * The in-app /legal pages render from this file, and `scripts/export-legal.mjs`
 * generates the partner-facing Markdown copies under `legal/` from the same
 * data, so the two can never drift.
 *
 * IMPORTANT: every document is a DRAFT prepared for independent legal review
 * by a Botswana-qualified attorney. Nothing here has been approved by counsel,
 * and no regulatory status is claimed. Company details marked [TO CONFIRM]
 * must be completed by the business before publication.
 */

export interface PolicySection {
  heading: string;
  paragraphs: string[];
}

export interface Policy {
  /** URL slug, e.g. "terms-of-service". */
  id: string;
  title: string;
  /** Version recorded in acceptance records, e.g. "1.0-draft". */
  version: string;
  status: "draft-pending-legal-review";
  lastUpdated: string; // ISO date
  summary: string;
  /** True when a user must accept this policy before using the dashboard. */
  requiredForSignup: boolean;
  sections: PolicySection[];
}

const REVIEW_NOTICE =
  "Document status: DRAFT pending independent legal review by a Botswana-qualified attorney. " +
  "This document does not claim that AuthePay holds any licence, certification, or regulatory approval.";

const OPERATOR =
  "AuthePay, a payments platform operated in Botswana by Skilllink [TO CONFIRM: registered legal entity name, company registration number, and registered address].";

export const POLICIES: Policy[] = [
  {
    id: "terms-of-service",
    title: "Terms of Service",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "The contract between you and AuthePay covering accounts, wallet and payment services, fees, suspension, and liability.",
    requiredForSignup: true,
    sections: [
      {
        heading: "1. About these terms",
        paragraphs: [
          `These Terms of Service govern your access to and use of the AuthePay platform, provided by ${OPERATOR} By creating an account or using the platform you agree to these terms.`,
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. The service",
        paragraphs: [
          "AuthePay provides payment infrastructure software: digital wallets, payment collections through licensed payment providers, merchant tools, developer APIs, transaction records, and reconciliation reporting.",
          "AuthePay is a technology platform, not a bank. Live payment processing is performed only through payment providers and financial institutions licensed under the National Clearance and Settlement Systems Act, 2003 and the Electronic Payment Services Regulations, 2019, with whom AuthePay holds executed agreements. Until such agreements are in place, the platform operates in test mode only and no real funds are moved.",
        ],
      },
      {
        heading: "3. Eligibility and accounts",
        paragraphs: [
          "You must be at least 18 years old and capable of contracting under Botswana law. Business accounts must be registered by an authorised representative.",
          "You are responsible for the accuracy of the information you provide, for safeguarding your credentials, and for all activity under your account. Identity and business verification (KYC/KYB) may be required before live payment features are enabled, consistent with the Financial Intelligence Act, 2022.",
        ],
      },
      {
        heading: "4. Payments, wallets, and records",
        paragraphs: [
          "Displayed balances and transaction histories are system records of the platform. A payment is final only when it reaches a successful terminal state; pending or processing payments may still fail or be reversed by the provider.",
          "Refunds and reversals follow the rules of the underlying payment provider and these terms. Settlement timelines depend on the provider and banking partners and are not guaranteed.",
        ],
      },
      {
        heading: "5. Fees and plans",
        paragraphs: [
          "Use of the platform may be subject to subscription plans and transaction fees published in your dashboard or agreed in writing. Fees are quoted in Botswana Pula (BWP) unless stated otherwise and are exclusive of applicable taxes.",
          "Trial access, where offered, is time-limited and may be restricted in functionality. Accounts with expired or unpaid subscriptions may be suspended, subject to notice.",
        ],
      },
      {
        heading: "6. Acceptable use",
        paragraphs: [
          "You must comply with the Acceptable Use Policy. You may not use the platform for unlawful purposes, money laundering, terrorist financing, fraud, or in violation of sanctions applicable in Botswana.",
        ],
      },
      {
        heading: "7. Suspension and termination",
        paragraphs: [
          "AuthePay may suspend or terminate access for breach of these terms, suspected unlawful activity, security risk, or non-payment, and will provide notice where lawful and practicable. You may close your account at any time; records are retained as required by law.",
        ],
      },
      {
        heading: "8. Liability",
        paragraphs: [
          "To the maximum extent permitted by Botswana law, AuthePay is not liable for indirect or consequential losses, provider outages, or delays caused by third-party payment networks. Nothing in these terms excludes liability that cannot be excluded under the Consumer Protection Act, 2018 or other applicable law.",
        ],
      },
      {
        heading: "9. Governing law",
        paragraphs: [
          "These terms are governed by the laws of Botswana. Disputes will be resolved in the courts of Botswana, unless the parties agree to arbitration.",
        ],
      },
    ],
  },
  {
    id: "privacy-policy",
    title: "Privacy Policy",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "How AuthePay collects, uses, shares, and protects personal data under the Botswana Data Protection Act, 2024 (Act No. 18 of 2024).",
    requiredForSignup: true,
    sections: [
      {
        heading: "1. Scope and controller",
        paragraphs: [
          `This policy explains how ${OPERATOR} processes personal data as a data controller under the Data Protection Act, 2024 (Act No. 18 of 2024) of Botswana ("the DPA").`,
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. Data we collect",
        paragraphs: [
          "Account data: name, email address, phone number, and authentication credentials (passwords are handled by our authentication provider and are never stored in plaintext).",
          "Transaction data: payment references, amounts, currencies, counterparties, and status history, which we must retain for financial record-keeping and anti-money-laundering purposes.",
          "Technical data: IP addresses, device/browser metadata, and audit-log entries used for security and fraud prevention.",
        ],
      },
      {
        heading: "3. Lawful bases and purposes",
        paragraphs: [
          "We process personal data to perform our contract with you (operating your account and processing payments), to comply with legal obligations (including the Financial Intelligence Act, 2022 and tax law), for our legitimate interests in securing the platform and preventing fraud, and, where required, on the basis of your consent, which you may withdraw at any time.",
        ],
      },
      {
        heading: "4. Sharing and processors",
        paragraphs: [
          "We use Supabase (cloud Postgres hosting and authentication) as a data processor, and licensed payment providers to execute transactions. Each processor is bound by contract to process data only on our documented instructions.",
          "We do not sell personal data. We disclose data to regulators, the Financial Intelligence Agency, or law enforcement only where required by Botswana law.",
        ],
      },
      {
        heading: "5. Cross-border transfers",
        paragraphs: [
          "Where personal data is transferred or hosted outside Botswana (for example, in our cloud provider's hosting region), we do so only where the destination provides an adequate level of protection or appropriate safeguards are in place, as required by the DPA.",
        ],
      },
      {
        heading: "6. Retention",
        paragraphs: [
          "Account and transaction records are retained for the periods required by the Financial Intelligence Act, 2022 and other applicable law (generally at least five years after the end of the relationship), after which they are securely deleted or anonymised.",
        ],
      },
      {
        heading: "7. Your rights",
        paragraphs: [
          "Under the DPA you have the right to access, rectify, erase, restrict, and object to processing of your personal data, the right to data portability, and the right to withdraw consent. You may exercise these rights through Settings or by contacting us.",
          "You also have the right to lodge a complaint with the Information and Data Protection Commission of Botswana.",
        ],
      },
      {
        heading: "8. Security and breach notification",
        paragraphs: [
          "We apply technical and organisational measures including row-level security, encryption in transit, hashed credential storage, audit logging, and least-privilege access.",
          "If a personal data breach occurs, we will notify the Information and Data Protection Commission without undue delay and, where feasible, within 72 hours of becoming aware of it, unless the breach is unlikely to result in a risk to your rights and freedoms. Affected data subjects will be notified where required by the DPA.",
        ],
      },
      {
        heading: "9. Contact",
        paragraphs: [
          "Data protection enquiries: [TO CONFIRM: privacy contact email]. A Data Protection Officer will be designated if required under the DPA once processing volumes are assessed during legal review.",
        ],
      },
    ],
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "Activities and businesses that are prohibited or restricted on the AuthePay platform.",
    requiredForSignup: false,
    sections: [
      {
        heading: "1. Purpose",
        paragraphs: [
          "This policy protects the platform, its users, payment partners, and the integrity of Botswana's financial system. It forms part of the Terms of Service.",
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. Prohibited activities",
        paragraphs: [
          "You may not use AuthePay for: money laundering or terrorist financing; fraud, theft, or deception; transactions violating sanctions applicable in Botswana; unlicensed gambling or lending; sale of unlawful goods or services; pyramid or Ponzi schemes; or any activity prohibited under the Financial Intelligence Act, 2022, the Cybercrime and Computer Related Crimes Act, 2018, or other Botswana law.",
        ],
      },
      {
        heading: "3. Platform abuse",
        paragraphs: [
          "You may not probe or bypass security controls, abuse test-mode providers to simulate real funds, create duplicate transactions to exploit settlement timing, interfere with other users' accounts, or misrepresent transaction status to your own customers.",
        ],
      },
      {
        heading: "4. Enforcement",
        paragraphs: [
          "Suspected violations may result in transaction holds, account suspension, termination, and reporting to the Financial Intelligence Agency or law enforcement where required by law. AuthePay cooperates with lawful investigations.",
        ],
      },
    ],
  },
  {
    id: "cookie-policy",
    title: "Cookie Policy",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "The cookies and similar technologies the AuthePay web application uses.",
    requiredForSignup: false,
    sections: [
      {
        heading: "1. What we use",
        paragraphs: [
          "The AuthePay web application uses strictly necessary cookies only: encrypted authentication session cookies set by our authentication provider (Supabase) to keep you signed in and to protect against cross-site request forgery.",
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. What we do not use",
        paragraphs: [
          "We do not use advertising cookies, third-party tracking pixels, or analytics cookies in the current release. If this changes, this policy will be updated and, where required, your consent will be requested before such cookies are set.",
        ],
      },
      {
        heading: "3. Managing cookies",
        paragraphs: [
          "Strictly necessary cookies cannot be disabled without signing out, as the platform cannot authenticate you without them. You can clear cookies through your browser settings at any time.",
        ],
      },
    ],
  },
  {
    id: "merchant-terms",
    title: "Merchant Terms",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "Additional terms for businesses accepting payments or integrating with AuthePay as merchants.",
    requiredForSignup: false,
    sections: [
      {
        heading: "1. Merchant onboarding and KYB",
        paragraphs: [
          "Before live payment acceptance is enabled, merchants must complete business verification (KYB) including company registration details, beneficial ownership, and, where applicable, licence information, consistent with the Financial Intelligence Act, 2022 and provider requirements.",
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. Collections and settlement",
        paragraphs: [
          "Customer payments are collected through licensed payment providers. Settlement to the merchant's designated account occurs on the schedule agreed with the provider; AuthePay provides settlement records and reconciliation data but does not control provider settlement timing.",
        ],
      },
      {
        heading: "3. Refunds and disputes",
        paragraphs: [
          "Merchants are responsible for their refund policy towards their customers, subject to the Consumer Protection Act, 2018. Refunds are processed through the platform against the original payment and are capped at the original collected amount.",
          "Merchants must respond to payment disputes and provider enquiries promptly. Excessive dispute rates may result in holds or termination.",
        ],
      },
      {
        heading: "4. Merchant obligations",
        paragraphs: [
          "Merchants must display accurate pricing, deliver the goods or services paid for, keep API credentials secret, and comply with the Acceptable Use Policy and API Terms.",
        ],
      },
    ],
  },
  {
    id: "api-terms",
    title: "API Terms",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "Rules for using AuthePay developer APIs, API keys, and webhooks.",
    requiredForSignup: false,
    sections: [
      {
        heading: "1. API keys",
        paragraphs: [
          "API keys are secrets issued to your account. Keys are shown once at creation and stored only as hashes. You must keep keys confidential, scope them minimally, rotate them periodically, and revoke them immediately if compromised.",
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. Environments",
        paragraphs: [
          "Test-mode API usage must never be presented to end users as live payment processing. Production access requires completed onboarding and, where applicable, executed provider agreements.",
        ],
      },
      {
        heading: "3. Webhooks",
        paragraphs: [
          "You must verify webhook signatures before acting on any event. AuthePay signs outbound webhooks and supports idempotent, retried delivery; your endpoint must tolerate duplicate delivery.",
        ],
      },
      {
        heading: "4. Fair use",
        paragraphs: [
          "API usage is subject to rate limits per plan. We may throttle or suspend keys that degrade the service. You may not resell raw API access without written agreement.",
        ],
      },
    ],
  },
  {
    id: "data-processing-addendum",
    title: "Data Processing Addendum",
    version: "1.0-draft",
    status: "draft-pending-legal-review",
    lastUpdated: "2026-09-22",
    summary:
      "Terms governing personal data that merchants ask AuthePay to process about their customers.",
    requiredForSignup: false,
    sections: [
      {
        heading: "1. Roles",
        paragraphs: [
          "Where a merchant uses AuthePay to collect payments from its customers, the merchant is the data controller and AuthePay acts as a data processor under the Data Protection Act, 2024 (Act No. 18 of 2024), processing customer personal data only on the merchant's documented instructions.",
          REVIEW_NOTICE,
        ],
      },
      {
        heading: "2. Processor obligations",
        paragraphs: [
          "AuthePay will: process personal data only for the agreed purposes (payment execution, records, reconciliation); ensure confidentiality undertakings from personnel; apply appropriate technical and organisational security measures; assist the merchant with data-subject requests; notify the merchant without undue delay after becoming aware of a personal data breach; and delete or return personal data at the end of the engagement, subject to legal retention duties.",
        ],
      },
      {
        heading: "3. Sub-processors",
        paragraphs: [
          "AuthePay uses Supabase (hosting/authentication) and licensed payment providers as sub-processors. AuthePay remains liable for its sub-processors and will notify merchants of material changes to this list.",
        ],
      },
      {
        heading: "4. International transfers",
        paragraphs: [
          "Transfers outside Botswana occur only where the destination provides adequate protection or appropriate safeguards exist, in line with the DPA.",
        ],
      },
      {
        heading: "5. Audit",
        paragraphs: [
          "On written request, AuthePay will make available information reasonably necessary to demonstrate compliance with this addendum, subject to security and confidentiality constraints.",
        ],
      },
    ],
  },
];

const BY_ID = new Map(POLICIES.map((p) => [p.id, p]));

/** Fetch a policy by slug, or null if unknown. */
export function getPolicy(id: string): Policy | null {
  return BY_ID.get(id) ?? null;
}

/** Policies a user must have accepted (current version) to use the dashboard. */
export function requiredSignupPolicies(): Policy[] {
  return POLICIES.filter((p) => p.requiredForSignup);
}

/** True when (policyId, version) exactly matches a current registry entry. */
export function isCurrentPolicyVersion(
  policyId: string,
  version: string
): boolean {
  const p = BY_ID.get(policyId);
  return Boolean(p && p.version === version);
}

/** Public URL path for a policy document. */
export function policyPath(policy: Policy): string {
  return `/legal/${policy.id}`;
}

