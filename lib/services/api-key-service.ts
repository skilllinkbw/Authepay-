/**
 * API key service (server-side only).
 *
 * Plaintext keys exist only in the create response; storage is a hash.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, notFound } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import {
  API_KEY_SCOPES,
  generateApiKey,
  hashApiKey,
  keyPrefix,
  type ApiKeyScope,
} from "../api-keys.ts";
import { logger } from "../logger.ts";

export interface CreatedApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  created_at: string;
  /** The raw secret — returned exactly once, never stored. */
  plaintext_key: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

function dbError(message: string): ApiError {
  return new ApiError(500, "db_error", message);
}

function sanitizeScopes(scopes: readonly string[]): ApiKeyScope[] {
  return scopes.filter((s): s is ApiKeyScope =>
    (API_KEY_SCOPES as readonly string[]).includes(s)
  );
}

/** Create an API key for a user. Returns metadata + the one-time plaintext key. */
export async function createUserApiKey(
  userId: string,
  name: string,
  requestedScopes: readonly string[]
): Promise<CreatedApiKey> {
  const admin = requireAdminClient();
  const scopes = sanitizeScopes(requestedScopes);
  const plaintext = generateApiKey();
  const hash = hashApiKey(plaintext);
  const prefix = keyPrefix(plaintext);

  try {
    const { data, error } = await admin.rpc("create_api_key", {
      p_owner_type: "user",
      p_owner_id: userId,
      p_name: name,
      p_key_prefix: prefix,
      p_key_hash: hash,
      p_scopes: scopes,
      p_expires_at: null,
    });
    if (error) throw dbError("Failed to create API key");
    const row = data as {
      id: string;
      name: string;
      key_prefix: string;
      scopes: string[];
      status: string;
      created_at: string;
    };
    return {
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
      scopes: row.scopes ?? [],
      status: row.status,
      created_at: row.created_at,
      plaintext_key: plaintext,
    };
  } catch (err) {
    logger.error("create_api_key failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err instanceof ApiError ? err : dbError("Failed to create API key");
  }
}

/** List API keys owned by a user (never includes hashes or secrets). */
export async function listUserApiKeys(
  supabase: SupabaseClient
): Promise<ApiKeyRecord[]> {
  const { data, error } = await supabase
    .from("api_keys")
    .select("id,name,key_prefix,scopes,status,expires_at,last_used_at,created_at")
    .order("created_at", { ascending: false });
  if (error) throw dbError("Failed to load API keys");
  return (data ?? []) as ApiKeyRecord[];
}

/** Revoke one of the user's own API keys. */
export async function revokeUserApiKey(
  userId: string,
  apiKeyId: string
): Promise<void> {
  const admin = requireAdminClient();
  try {
    const { error } = await admin.rpc("revoke_api_key", {
      p_api_key_id: apiKeyId,
      p_owner_type: "user",
      p_owner_id: userId,
    });
    if (error) throw dbError("Failed to revoke API key");
  } catch (err) {
    if (/api_key_not_found/.test(String(err))) throw notFound("API key not found");
    throw err;
  }
}