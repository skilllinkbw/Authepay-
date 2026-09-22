import { test } from "node:test";
import assert from "node:assert/strict";
import {
  POLICIES,
  getPolicy,
  isCurrentPolicyVersion,
  policyPath,
  requiredSignupPolicies,
} from "../lib/legal/policies.ts";

test("policy registry has unique ids and well-formed entries", () => {
  const ids = new Set(POLICIES.map((p) => p.id));
  assert.equal(ids.size, POLICIES.length);
  for (const p of POLICIES) {
    assert.match(p.id, /^[a-z0-9-]+$/);
    assert.match(p.version, /^\d+\.\d+/);
    assert.match(p.lastUpdated, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(p.sections.length >= 3, `${p.id} should have substantive sections`);
    for (const s of p.sections) {
      assert.ok(s.heading.length > 0);
      assert.ok(s.paragraphs.length > 0);
    }
  }
});

test("signup requires Terms of Service and Privacy Policy", () => {
  const required = requiredSignupPolicies().map((p) => p.id);
  assert.ok(required.includes("terms-of-service"));
  assert.ok(required.includes("privacy-policy"));
});

test("version validation accepts only the exact current version", () => {
  assert.equal(isCurrentPolicyVersion("terms-of-service", "1.0-draft"), true);
  assert.equal(isCurrentPolicyVersion("terms-of-service", "0.9"), false);
  assert.equal(isCurrentPolicyVersion("nonexistent", "1.0-draft"), false);
});

test("policy paths resolve under /legal", () => {
  for (const p of POLICIES) {
    assert.equal(policyPath(p), `/legal/${p.id}`);
    assert.equal(getPolicy(p.id)?.id, p.id);
  }
  assert.equal(getPolicy("does-not-exist"), null);
});

test("every document is marked as pending legal review", () => {
  // Guard: no document may silently lose its draft status. Removing the
  // draft marker requires a deliberate legal-review decision.
  for (const p of POLICIES) {
    assert.equal(p.status, "draft-pending-legal-review", p.id);
  }
});

test("documents make no false regulatory or certification claims", () => {
  const text = JSON.stringify(POLICIES).toLowerCase();
  const forbiddenClaims = [
    "licensed by the bank of botswana",
    "certified by",
    "pci-dss certified",
    "pci dss certified",
    "approved by the regulator",
    "fully compliant",
  ];
  for (const claim of forbiddenClaims) {
    assert.ok(!text.includes(claim), `documents must not claim: '${claim}'`);
  }
});
