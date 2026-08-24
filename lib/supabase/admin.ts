/**
 * Server-only Supabase client with elevated privileges.
 *
 * Used exclusively to call SECURITY DEFINER functions (financial operations,
 * audit logging) that are not exposed to RLS. The service-role key must never
 * be imported by client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigurationError } from "../errors.ts";

export type AdminClient = SupabaseClient;

export const SERVICE_ROLE_KEY_VAR = "SUPABASE_SERVICE_ROLE_KEY";

/** Create an admin client, or null when server secrets are not configured. */
export function createAdminClient(): AdminClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Create an admin client, throwing a clear configuration error if missing. */
export function requireAdminClient(): AdminClient {
  const client = createAdminClient();
  if (!client) {
    throw new ConfigurationError(
      "Financial services are not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment."
    );
  }
  return client;
}

/** Guard against accidentally shipping server secrets to the browser. */
export const isServerSide = typeof window === "undefined";