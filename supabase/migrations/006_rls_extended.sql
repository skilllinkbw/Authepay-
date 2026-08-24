-- 006_rls_extended.sql
-- RLS for payment intents, API keys, webhooks, audit logs and notifications.

alter table public.payment_intents enable row level security;
alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.transaction_events enable row level security;

-- payment_intents ------------------------------------------------------------
drop policy if exists payment_intents_select on public.payment_intents;
create policy payment_intents_select on public.payment_intents
  for select using (
    creator_user_id = auth.uid()
    or (wallet_id is not null and public.is_wallet_accessible(wallet_id))
    or (merchant_id is not null and exists(
          select 1 from public.merchants m
          where m.id = merchant_id and m.owner_id = auth.uid()))
    or public.is_admin()
  );

-- api_keys (no direct insert/delete from clients; only via service functions) --
drop policy if exists api_keys_select on public.api_keys;
create policy api_keys_select on public.api_keys
  for select using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'merchant' and exists(
          select 1 from public.merchants m
          where m.id = owner_id and m.owner_id = auth.uid()))
    or public.is_admin()
  );

drop policy if exists api_keys_update on public.api_keys;
create policy api_keys_update on public.api_keys
  for update using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'merchant' and exists(
          select 1 from public.merchants m
          where m.id = owner_id and m.owner_id = auth.uid()))
  );

-- webhook_endpoints ----------------------------------------------------------
drop policy if exists webhook_endpoints_select on public.webhook_endpoints;
create policy webhook_endpoints_select on public.webhook_endpoints
  for select using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'merchant' and exists(
          select 1 from public.merchants m
          where m.id = owner_id and m.owner_id = auth.uid()))
  );

drop policy if exists webhook_endpoints_insert on public.webhook_endpoints;
create policy webhook_endpoints_insert on public.webhook_endpoints
  for insert with check (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'merchant' and exists(
          select 1 from public.merchants m
          where m.id = owner_id and m.owner_id = auth.uid()))
  );

drop policy if exists webhook_endpoints_delete on public.webhook_endpoints;
create policy webhook_endpoints_delete on public.webhook_endpoints
  for delete using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'merchant' and exists(
          select 1 from public.merchants m
          where m.id = owner_id and m.owner_id = auth.uid()))
  );

-- webhook_deliveries ----------------------------------------------------------
drop policy if exists webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries
  for select using (
    exists(
      select 1 from public.webhook_endpoints e
      where e.id = endpoint_id
        and (
          (e.owner_type = 'user' and e.owner_id = auth.uid())
          or (e.owner_type = 'merchant' and exists(
                select 1 from public.merchants m
                where m.id = e.owner_id and m.owner_id = auth.uid()))
        )
    )
  );

-- audit_logs (admin read-only; writes via security-definer insert) ------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (public.is_admin());

-- notifications ---------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- transaction_events (read only via owning transaction) ------------------------
drop policy if exists transaction_events_select on public.transaction_events;
create policy transaction_events_select on public.transaction_events
  for select using (
    exists(
      select 1 from public.transactions t
      where t.id = transaction_id
        and (
          (t.from_wallet_id is not null and public.is_wallet_accessible(t.from_wallet_id))
          or (t.to_wallet_id is not null and public.is_wallet_accessible(t.to_wallet_id))
          or public.is_admin()
        )
    )
  );