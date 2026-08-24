-- 005_rls_core.sql
-- RLS for identities, wallets and the transaction ledger.
-- Money movement is NOT granted to authenticated roles; it happens only via
-- SECURITY DEFINER functions (see 0xx_functions).

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.wallets enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.transactions enable row level security;

-- profiles ----------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- merchants ----------------------------------------------------------------
drop policy if exists merchants_select on public.merchants;
create policy merchants_select on public.merchants
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists merchants_insert on public.merchants;
create policy merchants_insert on public.merchants
  for insert with check (owner_id = auth.uid());

drop policy if exists merchants_update on public.merchants;
create policy merchants_update on public.merchants
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists merchants_delete on public.merchants;
create policy merchants_delete on public.merchants
  for delete using (owner_id = auth.uid() or public.is_admin());

-- wallets (read-only for owners; writes only via functions) -----------------
drop policy if exists wallets_select on public.wallets;
create policy wallets_select on public.wallets
  for select using (public.is_wallet_accessible(id));

-- ledger_entries (read-only; writes only via functions) ---------------------
drop policy if exists ledger_select on public.ledger_entries;
create policy ledger_select on public.ledger_entries
  for select using (public.is_wallet_accessible(wallet_id));

-- transactions (read-only for wallets/creators; writes via functions) --------
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions
  for select using (
    (from_wallet_id is not null and public.is_wallet_accessible(from_wallet_id))
    or (to_wallet_id is not null and public.is_wallet_accessible(to_wallet_id))
    or public.is_admin()
  );