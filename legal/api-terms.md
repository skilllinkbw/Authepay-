# AuthePay — API Terms

**Version:** 1.0-draft  
**Status:** draft-pending-legal-review  
**Last updated:** 2026-09-22

> Rules for using AuthePay developer APIs, API keys, and webhooks.

## 1. API keys

API keys are secrets issued to your account. Keys are shown once at creation and stored only as hashes. You must keep keys confidential, scope them minimally, rotate them periodically, and revoke them immediately if compromised.

Document status: DRAFT pending independent legal review by a Botswana-qualified attorney. This document does not claim that AuthePay holds any licence, certification, or regulatory approval.

## 2. Environments

Test-mode API usage must never be presented to end users as live payment processing. Production access requires completed onboarding and, where applicable, executed provider agreements.

## 3. Webhooks

You must verify webhook signatures before acting on any event. AuthePay signs outbound webhooks and supports idempotent, retried delivery; your endpoint must tolerate duplicate delivery.

## 4. Fair use

API usage is subject to rate limits per plan. We may throttle or suspend keys that degrade the service. You may not resell raw API access without written agreement.
