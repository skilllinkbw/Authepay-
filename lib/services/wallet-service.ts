/**
 * Wallet + transaction services.
 *
 * All reads go through the user's own Supabase session so Row Level Security
 * is the enforcement boundary; clients can never read another user's data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, notFound } from "../errors.ts";
import type { LedgerEntry, Transaction, Wallet } from "../types.ts";
import type { Pagination } from "../server/api.ts";

function dbError(message: string): ApiError {
  return new ApiError(500, "db_error", message);
}

export async function getWalletForOwner(
  supabase: SupabaseClient,
  ownerType: "user" | "merchant",
  ownerId: string
): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw dbError("Failed to load wallet");
  if (!data) throw notFound("Wallet not found");
  return data as Wallet;
}

export async function listLedgerEntries(
  supabase: SupabaseClient,
  walletId: string,
  pagination: Pagination
): Promise<LedgerEntry[]> {
  const { limit, offset } = pagination;
  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw dbError("Failed to load ledger");
  return (data ?? []) as LedgerEntry[];
}

export async function listTransactionsForOwner(
  supabase: SupabaseClient,
  pagination: Pagination
): Promise<Transaction[]> {
  const { limit, offset } = pagination;
  // RLS restricts rows to those visible for this user's wallets.
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw dbError("Failed to load transactions");
  return (data ?? []) as Transaction[];
}

export async function getTransactionByReference(
  supabase: SupabaseClient,
  reference: string
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw dbError("Failed to load transaction");
  if (!data) throw notFound("Transaction not found");
  return data as Transaction;
}

export async function listRecentTransactions(
  supabase: SupabaseClient,
  limit = 5
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw dbError("Failed to load transactions");
  return (data ?? []) as Transaction[];
}