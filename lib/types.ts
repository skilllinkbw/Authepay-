/**
 * Shared AuthePay domain types and constants.
 */

export const ROLES = ["customer", "merchant", "developer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PAYMENT_TYPES = [
  "deposit",
  "withdrawal",
  "payment",
  "refund",
  "transfer",
  "topup",
] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const WALLET_OWNER_TYPES = ["user", "merchant"] as const;
export type WalletOwnerType = (typeof WALLET_OWNER_TYPES)[number];

export const WALLET_STATUSES = ["active", "frozen", "closed"] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

/** Ledger movement direction. */
export const LEDGER_DIRECTIONS = ["credit", "debit"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export interface Wallet {
  id: string;
  owner_type: WalletOwnerType;
  owner_id: string;
  currency: string;
  balance_minor: number;
  status: WalletStatus;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  wallet_id: string;
  direction: LedgerDirection;
  amount_minor: number;
  balance_after_minor: number;
  reason: string;
  reference: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: PaymentType;
  status: PaymentStatus;
  amount_minor: number;
  currency: string;
  reference: string;
  idempotency_key: string | null;
  from_wallet_id: string | null;
  to_wallet_id: string | null;
  description: string | null;
  provider: string | null;
  provider_reference: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface PaymentIntent {
  id: string;
  merchant_id: string | null;
  wallet_id: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  idempotency_key: string | null;
  provider: string;
  provider_reference: string | null;
  description: string | null;
  customer_phone: string | null;
  callback_url: string | null;
  success_url: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpoint {
  id: string;
  owner_id: string;
  url: string;
  events: string[];
  secret: string | null;
  created_at: string;
}

export interface ApiKey {
  id: string;
  owner_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: "active" | "revoked";
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

/** What a merchant-facing payment looks like. */
export interface PaymentOutcome {
  reference: string;
  status: PaymentStatus;
  amount_minor: number;
  currency: string;
  provider: string;
  created_at: string;
}

export const isValidPaymentStatus = (value: unknown): value is PaymentStatus =>
  typeof value === "string" &&
  (PAYMENT_STATUSES as readonly string[]).includes(value);

export const isValidPaymentType = (value: unknown): value is PaymentType =>
  typeof value === "string" && (PAYMENT_TYPES as readonly string[]).includes(value);

export const isValidRole = (value: unknown): value is Role =>
  typeof value === "string" && (ROLES as readonly string[]).includes(value);