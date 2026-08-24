/**
 * Provider registry: resolves the active provider from configuration.
 */

import { badRequest, ConfigurationError } from "../errors.ts";
import { TestProvider, TEST_PROVIDER_NAME } from "./test-provider.ts";
import {
  BANK_TRANSFER,
  MYZAKA,
  ORANGE_MONEY_BW,
  SMEGA,
  createUnconfiguredProvider,
} from "./unconfigured.ts";
import type { PaymentProvider } from "./types.ts";

export const PROVIDER_IDS = [
  TEST_PROVIDER_NAME,
  "orange_money_bw",
  "myzaka",
  "smega",
  "bank_transfer",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

function build(id: ProviderId): PaymentProvider {
  switch (id) {
    case TEST_PROVIDER_NAME:
      return new TestProvider();
    case "orange_money_bw":
      return createUnconfiguredProvider(ORANGE_MONEY_BW);
    case "myzaka":
      return createUnconfiguredProvider(MYZAKA);
    case "smega":
      return createUnconfiguredProvider(SMEGA);
    case "bank_transfer":
      return createUnconfiguredProvider(BANK_TRANSFER);
  }
}

/** Resolve a provider by id (defaults to configured PAYMENT_PROVIDER). */
export function resolveProvider(id?: string | null): PaymentProvider {
  const providerId = (id ?? process.env.PAYMENT_PROVIDER ?? TEST_PROVIDER_NAME) as ProviderId;
  if (!(PROVIDER_IDS as readonly string[]).includes(providerId)) {
    throw badRequest(`Unknown payment provider '${providerId}'`, "unknown_provider");
  }
  return build(providerId);
}

/** The default provider for this deployment. */
export function defaultProvider(): PaymentProvider {
  const raw = process.env.PAYMENT_PROVIDER;
  if (!raw) {
    // Fail loudly in production rather than silently falling back to test.
    if (process.env.NODE_ENV === "production" && !process.env.PAYMENT_TEST_MODE) {
      throw new ConfigurationError("PAYMENT_PROVIDER is not configured.");
    }
    return build(TEST_PROVIDER_NAME);
  }
  return resolveProvider(raw);
}