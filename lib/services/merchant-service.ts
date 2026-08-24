/**
 * Merchant + notification services.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../errors.ts";
import { requireAdminClient } from "../supabase/admin.ts";
import type { Notification } from "../types.ts";

export interface MerchantRecord {
  id: string;
  owner_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

function dbError(message: string): ApiError {
  return new ApiError(500, "db_error", message);
}

/** List merchants owned by the caller. */
export async function listMyMerchants(
  supabase: SupabaseClient
): Promise<MerchantRecord[]> {
  const { data, error } = await supabase
    .from("merchants")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw dbError("Failed to load merchants");
  return (data ?? []) as MerchantRecord[];
}

/** Create a merchant owned by the caller (RLS enforces ownership). */
export async function createMerchant(
  supabase: SupabaseClient,
  ownerId: string,
  name: string,
  description: string | null
): Promise<MerchantRecord> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || "merchant";

  const { data, error } = await supabase
    .from("merchants")
    .insert({ owner_id: ownerId, name, slug, description })
    .select("*")
    .single();
  if (error) throw dbError("Failed to create merchant");
  return data as MerchantRecord;
}

/** Update merchant details owned by the caller. */
export async function updateMerchant(
  supabase: SupabaseClient,
  merchantId: string,
  patch: { name?: string; description?: string | null }
): Promise<MerchantRecord> {
  const { data, error } = await supabase
    .from("merchants")
    .update(patch)
    .eq("id", merchantId)
    .select("*")
    .maybeSingle();
  if (error) throw dbError("Failed to update merchant");
  if (!data) throw new ApiError(404, "not_found", "Merchant not found");
  return data as MerchantRecord;
}

/** List notifications for the caller. */
export async function listNotifications(
  supabase: SupabaseClient,
  limit: number,
  offset: number
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw dbError("Failed to load notifications");
  return (data ?? []) as Notification[];
}

/** Mark a notification as read for the caller. */
export async function markNotificationRead(
  supabase: SupabaseClient,
  userId: string,
  notificationId: number
): Promise<void> {
  const admin = requireAdminClient();
  const { error } = await admin.rpc("mark_notification_read", {
    p_notification_id: notificationId,
    p_user_id: userId,
  });
  if (error) throw dbError("Failed to update notification");
}