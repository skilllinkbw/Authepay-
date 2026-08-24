/**
 * Placeholder adapters for real Botswana payment providers.
 *
 * Each adapter implements the PaymentProvider interface but refuses to run
 * until its credentials are configured in the server environment. This keeps
 * the integration surface honest: no fake confirmations are ever produced.
 */

import { ProviderNotConfiguredError } from "../errors.ts";
import type {
  PaymentProvider,
  ProviderEventResult,
  ProviderInitiationInput,
  ProviderInitiationResult,
} from "./types.ts";

export interface ProviderCredentialSpec {
  name: string;
  envVars: readonly string[];
}

function hasAllCredentials(spec: ProviderCredentialSpec): boolean {
  return spec.envVars.every((v) => Boolean(process.env[v]));
}

export function createUnconfiguredProvider(
  spec: ProviderCredentialSpec
): PaymentProvider {
  return {
    name: spec.name,
    get isConfigured(): boolean {
      return hasAllCredentials(spec);
    },
    async initiatePayment(_input: ProviderInitiationInput): Promise<ProviderInitiationResult> {
      if (!hasAllCredentials(spec)) {
        throw new ProviderNotConfiguredError(spec.name);
      }
      // Real HTTP integration goes here once credentials are available.
      throw new ProviderNotConfiguredError(spec.name);
    },
    async verifyWebhook(_ctx): Promise<ProviderEventResult> {
      throw new ProviderNotConfiguredError(spec.name);
    },
  };
}

export const ORANGE_MONEY_BW: ProviderCredentialSpec = {
  name: "orange_money_bw",
  envVars: ["ORANGE_MONEY_BW_API_KEY", "ORANGE_MONEY_BW_MERCHANT_ID"],
};

export const MYZAKA: ProviderCredentialSpec = {
  name: "myzaka",
  envVars: ["MYZAKA_API_KEY"],
};

export const SMEGA: ProviderCredentialSpec = {
  name: "smega",
  envVars: ["SMEGA_API_KEY"],
};

export const BANK_TRANSFER: ProviderCredentialSpec = {
  name: "bank_transfer",
  envVars: ["BANK_TRANSFER_CLIENT_ID", "BANK_TRANSFER_CLIENT_SECRET"],
};