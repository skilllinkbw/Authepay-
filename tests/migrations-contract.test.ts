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
  for (const name of ["010_security_hardening.sql", "011_settlement_and_rpc_hardening.sql"]) {
    const sql = read(name);
    assert.doesNotMatch(sql, /eyJhbGciOi/i); // JWT fragments
    assert.doesNotMatch(sql, /supabase\.co/i); // real project URLs
    assert.doesNotMatch(sql, /password\s*=.*["']/i);
  }
});