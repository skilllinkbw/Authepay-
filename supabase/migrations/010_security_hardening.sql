-- 010_security_hardening.sql
-- Remediation for audit findings S-02, S-03, S-05/F-02/F-03/F-04.
--
-- S-02: users could UPDATE their own profiles.role to 'admin'. Fixed with:
--   (a) column-level GRANTs - authenticated users may no longer write `role`;
--   (b) a BEFORE UPDATE trigger that rejects any role change unless performed
--       by an admin or via the service-role key (auth.uid() IS NULL).
--
-- S-03: api_keys owners could directly UPDATE key_hash/scopes/status. Fixed by
--   removing the UPDATE privilege; revocation happens only via revoke_api_key().
--
-- S-05/F-02/F-03: refunds credited the wrong wallet (money creation) and had
--   no authorization, idempotency or cumulative cap. Replaced by the
--   `refunds` table + `create_refund()` which reverses the ORIGINAL movement
--   (debit the receiver / credit the payer), locks the original transaction,
--   enforces cumulative refund <= original amount, and is idempotent on
--   idempotency_key.

-- ---------------------------------------------------------------------------
-- S-02: profiles.role can no longer be written by the row owner.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (full_name, phone, onboarding_completed) on public.profiles to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    -- Service-role key (no user JWT) or an authenticated admin may change roles.
    if auth.uid() is null or public.is_admin() then
      return new;
    end if;
    raise exception 'role_change_forbidden';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- S-03: api_keys are immutable from the client. Revoke-only via RPC.
-- ---------------------------------------------------------------------------
revoke update on public.api_keys from authenticated;

-- ---------------------------------------------------------------------------
-- S-05/F-02/F-03/F-04: refund ledger correctness + authorization.
-- ---------------------------------------------------------------------------
create table if not exists public.refunds (
  id                      uuid primary key default gen_random_uuid(),
  original_transaction_id uuid not null references public.transactions(id) on delete restrict,
  refund_transaction_id   uuid references public.transactions(id) on delete set null,
  amount_minor            bigint not null check (amount_minor > 0),
  currency                text not null,
  status                  text not null default 'pending'
                            check (status in ('pending','succeeded','failed')),
  reason                  text,
  requested_by            uuid references public.profiles(id) on delete set null,
  idempotency_key         text unique,
  created_at              timestamptz not null default now()
);
create index if not exists refunds_original_idx
  on public.refunds (original_transaction_id);

alter table public.refunds enable row level security;

drop policy if exists refunds_select on public.refunds;
create policy refunds_select on public.refunds
  for select using (public.is_admin());

-- create_refund(): the ONLY way refunds are applied.
-- Reverses the original movement so no money is created:
--   deposit/topup                   -> debit  to_wallet
--   withdrawal                      -> credit from_wallet
--   payment/transfer (from -> to)   -> debit to_wallet, credit from_wallet
-- Authorization: actor must be an admin, or the owner of the merchant wallet
-- that RECEIVED the funds (merchant refunding its customer).
create or replace function public.create_refund(
  p_txn_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_ref_reference text,
  p_idempotency_key text,
  p_reason text,
  p_actor uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_orig public.transactions%rowtype;
  v_actor_role text;
  v_actor_is_admin boolean := false;
  v_actor_owns_receiver boolean := false;
  v_refunded_sum bigint := 0;
  v_refund_id uuid;
  v_txn_id uuid;
  v_resulting_status text;
  v_replay jsonb;
  v_refund jsonb;
  v_txn jsonb;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'invalid_refund_amount';
  end if;

  -- Idempotent replay: return the prior refund when the key was already used.
  if p_idempotency_key is not null then
    select to_jsonb(r) into v_replay from public.refunds r
      where r.idempotency_key = p_idempotency_key;
    if v_replay is not null then
      return jsonb_build_object('refund', v_replay, 'replayed', true);
    end if;
  end if;

  -- Serialize concurrent refunds of the same original transaction.
  perform pg_advisory_xact_lock(hashtext('authepay:refund:' || p_txn_reference));

  select * into v_orig from public.transactions
    where reference = p_txn_reference for update;
  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_orig.type = 'refund' then
    raise exception 'not_refundable';
  end if;
  if v_orig.status not in ('succeeded', 'partially_refunded') then
    raise exception 'not_refundable';
  end if;
  if v_orig.currency <> p_currency then
    raise exception 'currency_mismatch';
  end if;

  -- ---- authorization (defense in depth; the API also checks this) --------
  select role into v_actor_role from public.profiles where id = p_actor;
  v_actor_is_admin := v_actor_role = 'admin';

  if v_orig.to_wallet_id is not null then
    select exists(
      select 1 from public.wallets w
        join public.merchants m on m.id = w.owner_id
      where w.id = v_orig.to_wallet_id
        and w.owner_type = 'merchant'
        and m.owner_id = p_actor
    ) into v_actor_owns_receiver;
  end if;

  if not (v_actor_is_admin or v_actor_owns_receiver) then
    raise exception 'refund_forbidden';
  end if;

  -- ---- cumulative cap ------------------------------------------------------
  select coalesce(sum(amount_minor), 0) into v_refunded_sum
    from public.refunds
    where original_transaction_id = v_orig.id and status = 'succeeded';

  if p_amount_minor > v_orig.amount_minor - v_refunded_sum then
    raise exception 'refund_exceeds_refundable';
  end if;

  -- ---- record the refund request first (unique idempotency_key) -----------
  begin
    insert into public.refunds
      (original_transaction_id, amount_minor, currency, status, reason,
       requested_by, idempotency_key)
    values
      (v_orig.id, p_amount_minor, p_currency, 'pending', p_reason,
       p_actor, p_idempotency_key)
    returning id into v_refund_id;
  exception
    when unique_violation then
      -- Concurrent request with the same idempotency key: the advisory lock
      -- serialises refunds of the same original, so this row exists committed.
      select to_jsonb(r) into v_replay
        from public.refunds r where r.idempotency_key = p_idempotency_key;
      if v_replay is not null then
        return jsonb_build_object('refund', v_replay, 'replayed', true);
      end if;
      raise;
  end;

  -- ---- reverse the original movement atomically ---------------------------
  begin
    if v_orig.type in ('deposit', 'topup') then
      perform public._post_movement(v_orig.to_wallet_id, 'debit', p_amount_minor,
        'refund_of:' || v_orig.reference, p_ref_reference, null);
    elsif v_orig.type = 'withdrawal' then
      perform public._post_movement(v_orig.from_wallet_id, 'credit', p_amount_minor,
        'refund_of:' || v_orig.reference, p_ref_reference, null);
    elsif v_orig.type in ('payment', 'transfer') then
      perform public._post_movement(v_orig.to_wallet_id, 'debit', p_amount_minor,
        'refund_of:' || v_orig.reference, p_ref_reference, null);
      if v_orig.from_wallet_id is not null then
        perform public._post_movement(v_orig.from_wallet_id, 'credit', p_amount_minor,
          'refund_to:' || v_orig.reference, p_ref_reference, null);
      end if;
    else
      raise exception 'not_refundable';
    end if;
  exception when others then
    update public.refunds set status = 'failed' where id = v_refund_id;
    raise;
  end;

  -- ---- refund transaction row (audit trail ties back to the original) -----
  insert into public.transactions
    (type, status, amount_minor, currency, reference, idempotency_key,
     from_wallet_id, to_wallet_id, description, metadata)
  values
    ('refund', 'processing', p_amount_minor, p_currency, p_ref_reference, null,
     v_orig.to_wallet_id, v_orig.from_wallet_id, p_reason,
     jsonb_build_object('refund_of', v_orig.reference, 'refund_id', v_refund_id))
  returning id into v_txn_id;

  -- Point the refund's ledger entries at the refund transaction for audit.
  update public.ledger_entries
     set transaction_id = v_txn_id
   where reference = p_ref_reference and transaction_id is null;

  v_resulting_status := case
    when p_amount_minor >= v_orig.amount_minor - v_refunded_sum then 'refunded'
    else 'partially_refunded' end;

  update public.transactions
     set status = v_resulting_status, updated_at = now(), completed_at = now()
   where id = v_orig.id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_orig.id, v_orig.status, v_resulting_status, 'refund_applied', p_actor::text);

  update public.transactions
     set status = 'succeeded', updated_at = now(), completed_at = now()
   where id = v_txn_id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_txn_id, 'processing', 'succeeded', 'refund_completed', p_actor::text);

  update public.refunds
     set status = 'succeeded', refund_transaction_id = v_txn_id
   where id = v_refund_id;

  select to_jsonb(r) into v_refund from public.refunds r where r.id = v_refund_id;
  select to_jsonb(t) into v_txn from public.transactions t where t.id = v_txn_id;
  return jsonb_build_object('refund', v_refund, 'transaction', v_txn, 'replayed', false);
end;
$$;
