import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * STATIC CONTRACT TESTS for the remediation migrations.
 *
 * These do NOT run against a database (that is BLOCKED without Supabase
 * credentials). They assert that the migration files shipped in this repo
 * contain the safeguards required by the security remediation, so a review or
 * a deploy cannot silently drop the protections. Apply + integration testing
 * against a real Supabase project remains a required BLOCKED item.
 */

const MIGRATIONS = join(fileURLToPath(import.meta.url), "..", "..", "supabase", "migrations");
const read = (name: string) => readFileSync(join(MIGRATIONS, name), "utf8");

test("migration 010 protects profiles.role from self-escalation (S-02)", () => {
  const sql = read("010_security_hardening.sql");
  assert.match(sql, /revoke update on public\.profiles from authenticated/i);
  assert.match(sql, /grant update \(full_name, phone, onboarding_completed\)/i);
  assert.match(sql, /protect_profile_role/i);
  assert.match(sql, /role_change_forbidden/i);
});

test("migration 010 removes client UPDATE on api_keys (S-03)", () => {
  const sql = read("010_security_hardening.sql");
  assert.match(sql, /revoke update on public\.api_keys from authenticated/i);
});

test("migration 010 creates the refunds ledger + create_refund RPC", () => {
  const sql = read("010_security_hardening.sql");
  assert.match(sql, /create table if not exists public\.refunds/i);
  assert.match(sql, /create or replace function public\.create_refund/i);
  assert.match(sql, /hashtext\('authepay:refund:/i); // advisory lock
  assert.match(sql, /refund_exceeds_refundable/i); // cumulative cap
  assert.match(sql, /refund_forbidden/i); // authorization
  assert.match(sql, /currency_mismatch/i);
});

test("migration 011 revokes PUBLIC execution on money RPCs", () => {
  const sql = read("011_settlement_and_rpc_hardening.sql");
  assert.match(sql, /revoke execute on function public\._post_movement/i);
  assert.match(sql, /revoke execute on function public\.execute_transfer/i);
  assert.match(sql, /grant execute on function[\s\S]*to service_role/i);
});

test("migration 011 adds recipient lookup, state machine and settlement", () => {
  const sql = read("011_settlement_and_rpc_hardening.sql");
  assert.match(sql, /create or replace function public\.lookup_transfer_recipient/i);
  assert.match(sql, /create or replace function public\.assert_txn_transition/i);
  assert.match(sql, /create or replace function public\.settle_payment_intent/i);
  assert.match(sql, /create or replace function public\.fail_payment_intent/i);
  assert.match(sql, /invalid_transition:%:%/i);
});

test("no remediation migration contains literal secrets or connection strings", () => {
  for (const name of [
    "010_security_hardening.sql",
    "011_settlement_and_rpc_hardening.sql",
    "012_legal_acceptance.sql",
    "013_commercial.sql",
  ]) {
    const sql = read(name);
    assert.doesNotMatch(sql, /eyJhbGciOi/i); // JWT fragments
    assert.doesNotMatch(sql, /supabase\.co/i); // real project URLs
    assert.doesNotMatch(sql, /password\s*=.*["']/i);
  }
});

test("migration 012 records policy acceptance append-only via service-role RPC", () => {
  const sql = read("012_legal_acceptance.sql");
  assert.match(sql, /create table if not exists public\.policy_acceptances/i);
  assert.match(sql, /unique \(user_id, policy_id, policy_version\)/i); // idempotent
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke insert, update, delete on public\.policy_acceptances from authenticated/i);
  assert.match(sql, /create or replace function public\.record_policy_acceptance/i);
  assert.match(sql, /revoke all on function public\.record_policy_acceptance[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.record_policy_acceptance[\s\S]*to service_role/i);
});

test("migration 013 subscriptions are admin-writable only, with auto-provisioning", () => {
  const sql = read("013_commercial.sql");
  assert.match(sql, /create table if not exists public\.subscriptions/i);
  assert.match(sql, /check \(status in \('trialing','active','past_due','suspended','cancelled'\)\)/i);
  assert.match(sql, /create trigger on_profile_created_subscription/i); // auto-provision
  assert.match(sql, /revoke insert, update, delete on public\.subscriptions from authenticated/i);
  assert.match(sql, /create or replace function public\.set_subscription/i);
  assert.match(sql, /role = 'admin'/i); // in-RPC authorization re-check
  assert.match(sql, /grant execute on function public\.set_subscription[\s\S]*to service_role/i);
});