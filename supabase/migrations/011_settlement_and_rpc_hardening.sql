-- 011_settlement_and_rpc_hardening.sql
-- Remediation for audit findings F-01 (incomplete settlement pipeline),
-- S-04 (recipient lookup blocked by RLS), F-05 (no SQL state machine), plus a
-- follow-on hardening fix: every money SECURITY DEFINER function previously
-- had the Postgres default `EXECUTE` grant to PUBLIC, meaning any signed-in
-- user could call e.g. execute_transfer() directly against ANOTHER user's
-- wallet. Financial RPCs are server-only (service-role) and must not be
-- callable by anon/authenticated roles.

-- ---------------------------------------------------------------------------
-- 1. RPC surface hardening: money functions are service-role only.
-- ---------------------------------------------------------------------------
revoke execute on function public._post_movement(uuid, text, bigint, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.execute_transfer(uuid, text, uuid, bigint, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.apply_credit(uuid, bigint, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.apply_debit(uuid, bigint, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.apply_refund(text, bigint, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.create_refund(text, bigint, text, text, text, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.create_payment_intent(uuid, uuid, uuid, bigint, text, text, text, text, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
revoke execute on function public.update_transaction_status(text, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.set_user_role(uuid, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.create_api_key(text, uuid, text, text, text, text[], timestamptz)
  from public, anon, authenticated;
revoke execute on function public.revoke_api_key(uuid, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.touch_api_key_last_used(text)
  from public, anon, authenticated;
revoke execute on function public.insert_audit_log(uuid, text, text, text, jsonb, text, text)
  from public, anon, authenticated;
revoke execute on function public.mark_notification_read(bigint, uuid)
  from public, anon, authenticated;

grant execute on function
  public._post_movement(uuid, text, bigint, text, text, uuid),
  public.execute_transfer(uuid, text, uuid, bigint, text, text, text),
  public.apply_credit(uuid, bigint, text, text, text, text, text, text),
  public.apply_debit(uuid, bigint, text, text, text, text, text, text),
  public.apply_refund(text, bigint, text, text, text, text),
  public.create_refund(text, bigint, text, text, text, text, uuid),
  public.create_payment_intent(uuid, uuid, uuid, bigint, text, text, text, text, text, text, text, text, timestamptz, jsonb),
  public.update_transaction_status(text, text, text, text, text),
  public.set_user_role(uuid, text, uuid),
to service_role;

-- ---------------------------------------------------------------------------
-- 2. S-04: transfer recipient resolution.
-- The transfers route previously queried `profiles` with the caller's session
-- client, but RLS (`profiles_select`) hides other users, so every P2P
-- transfer failed with "Recipient not found". This SECURITY DEFINER lookup
-- returns the minimum needed to execute a transfer (id, name, wallet id).
-- ---------------------------------------------------------------------------
create or replace function public.lookup_transfer_recipient(
  p_email text,
  p_phone text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_wallet_id uuid;
begin
  if p_email is null and p_phone is null then
    raise exception 'recipient_not_specified';
  end if;

  if p_email is not null then
    select pr.id, pr.full_name
      into v_profile
      from public.profiles pr
      join auth.users au on au.id = pr.id
     where lower(au.email) = lower(p_email)
     limit 1;
  else
    select pr.id, pr.full_name
      into v_profile
      from public.profiles pr
     where pr.phone = p_phone
     limit 1;
  end if;

  if v_profile.id is null then
    return null;
  end if;

  select w.id into v_wallet_id
    from public.wallets w
   where w.owner_type = 'user' and w.owner_id = v_profile.id
   order by w.created_at
   limit 1;

  if v_wallet_id is null then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', v_profile.id,
    'full_name', v_profile.full_name,
    'wallet_id', v_wallet_id
  );
end;
$$;

revoke execute on function public.lookup_transfer_recipient(text, text)
  from public, anon;
grant execute on function public.lookup_transfer_recipient(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. F-05: enforce the transaction state machine in SQL (mirrors
-- lib/payments/state.ts). Terminal states are irreversible.
-- ---------------------------------------------------------------------------
create or replace function public.assert_txn_transition(
  p_from text,
  p_to text
)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_from = p_to then
    return; -- no-op transition is always fine
  end if;
  if p_from = 'pending' and p_to in ('processing', 'succeeded', 'failed', 'cancelled') then
    return;
  end if;
  if p_from = 'processing' and p_to in ('succeeded', 'failed', 'cancelled') then
    return;
  end if;
  if p_from = 'succeeded' and p_to in ('refunded', 'partially_refunded') then
    return;
  end if;
  if p_from = 'partially_refunded' and p_to in ('refunded', 'partially_refunded') then
    return;
  end if;
  raise exception 'invalid_transition:%:%', p_from, p_to;
end;
$$;
-- ---------------------------------------------------------------------------
-- 4. F-05: replace the permissive update_transaction_status with a version that
-- enforces the same state machine before every change. Terminal states become
-- irreversible even through the service role.
-- ---------------------------------------------------------------------------
create or replace function public.update_transaction_status(
  p_reference text,
  p_from_status text,
  p_to_status text,
  p_reason text,
  p_actor text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_txn public.transactions%rowtype;
begin
  select * into v_txn from public.transactions
    where reference = p_reference for update;
  if not found then
    raise exception 'transaction_not_found';
  end if;

  if p_from_status is not null and v_txn.status <> p_from_status then
    raise exception 'unexpected_state:%:%', v_txn.status, coalesce(p_from_status,'null');
  end if;

  perform public.assert_txn_transition(v_txn.status, p_to_status);

  update public.transactions
     set status = p_to_status,
         error_message = case when p_to_status = 'failed' then p_reason else null end,
         updated_at = now(),
         completed_at = case when p_to_status in ('succeeded','failed','cancelled','refunded')
                             then now() else completed_at end
   where id = v_txn.id;

  insert into public.transaction_events
    (transaction_id, from_status, to_status, reason, actor)
  values (v_txn.id, v_txn.status, p_to_status, p_reason, p_actor);

  return to_jsonb(t) from public.transactions t where t.id = v_txn.id;
end;
$$;

revoke execute on function public.update_transaction_status(text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.update_transaction_status(text, text, text, text, text)
  to service_role;
-- ---------------------------------------------------------------------------
-- 5. F-01: settlement. A provider webhook (after signature verification and
-- replay dedupe) settles a payment intent THROUGH this function only. Money is
-- credited exactly once: the transaction row is created here with a unique
-- reference derived from the intent, and unique-violation replays return the
-- already-settled transaction instead of crediting again.
-- ---------------------------------------------------------------------------
create or replace function public.settle_payment_intent(
  p_intent_reference text,
  p_provider_reference text,
  p_actor text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
  v_txn_id uuid;
  v_txn jsonb;
  v_wallet uuid;
begin
  select * into v_intent from public.payment_intents
    where reference = p_intent_reference for update;
  if not found then
    raise exception 'intent_not_found';
  end if;

  -- Terminal intents are immutable; re-delivered success webhooks are a no-op.
  if v_intent.status = 'succeeded' then
    select to_jsonb(t) into v_txn from public.transactions t
      where t.reference = 'pi_' || p_intent_reference limit 1;
    return coalesce(v_txn, jsonb_build_object('already_settled', true));
  end if;
  if v_intent.status in ('failed', 'cancelled') then
    raise exception 'intent_not_settleable:%', v_intent.status;
  end if;

  -- Settlement target: explicit wallet, else the creator's user wallet.
  v_wallet := v_intent.wallet_id;
  if v_wallet is null then
    if v_intent.creator_user_id is null then
      raise exception 'no_settlement_wallet';
    end if;
    select w.id into v_wallet from public.wallets w
     where w.owner_type = 'user' and w.owner_id = v_intent.creator_user_id
     order by w.created_at limit 1;
  end if;
  if v_wallet is null then
    raise exception 'no_settlement_wallet';
  end if;

  update public.payment_intents
     set status = 'processing', updated_at = now()
   where id = v_intent.id;

  begin
    insert into public.transactions
      (type, status, amount_minor, currency, reference, idempotency_key,
       to_wallet_id, description, provider, provider_reference, metadata)
    values
      ('deposit', 'processing', v_intent.amount_minor, v_intent.currency,
       'pi_' || v_intent.reference, 'pi_' || v_intent.reference,
       v_wallet, v_intent.description, v_intent.provider,
       p_provider_reference,
       jsonb_build_object('kind','payment_settlement','intent_reference', v_intent.reference,
                          'merchant_id', v_intent.merchant_id))
    returning id into v_txn_id;

    perform public._post_movement(v_wallet, 'credit', v_intent.amount_minor,
      'payment_settlement:' || v_intent.reference, 'pi_' || v_intent.reference, v_txn_id);

    update public.transactions set status='succeeded', updated_at=now(), completed_at=now()
      where id = v_txn_id;
    insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
      values (v_txn_id, 'processing', 'succeeded', 'payment_settled', p_actor);
  exception
    when unique_violation then
      -- Already settled (webhook redelivery): return existing txn, credit nothing.
      select to_jsonb(t) into v_txn from public.transactions t
        where t.reference = 'pi_' || v_intent.reference limit 1;
      if v_txn is not null then
        update public.payment_intents set status='succeeded', updated_at=now()
          where id = v_intent.id and status <> 'succeeded';
        return v_txn;
      end if;
      raise;
  end;

  update public.payment_intents
     set status='succeeded', provider_reference = coalesce(p_provider_reference, provider_reference),
         updated_at = now()
   where id = v_intent.id;

  select to_jsonb(t) into v_txn from public.transactions t where id = v_txn_id;
  return v_txn;
end;
$$;
-- Mark an intent failed (verified failure webhook / provider error / expiry).
-- Never touches balances: intents have no movement until settlement.
create or replace function public.fail_payment_intent(
  p_intent_reference text,
  p_reason text,
  p_actor text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents%rowtype;
begin
  select * into v_intent from public.payment_intents
    where reference = p_intent_reference for update;
  if not found then
    raise exception 'intent_not_found';
  end if;

  if v_intent.status in ('succeeded', 'failed', 'cancelled') then
    -- Terminal; redelivered failure webhooks must not flip a settled payment.
    return to_jsonb(v_intent);
  end if;

  update public.payment_intents
     set status='failed', updated_at=now()
   where id = v_intent.id;

  -- Any transaction already opened for this intent is failed too (no movement
  -- was ever posted for intents, so balances are untouched).
  update public.transactions
     set status='failed', error_message=p_reason, updated_at=now(), completed_at=now()
   where reference = 'pi_' || p_intent_reference and status in ('pending','processing');

  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
  select id, status, 'failed', p_reason, p_actor
    from public.transactions
   where reference = 'pi_' || p_intent_reference;

  return to_jsonb(pi) from public.payment_intents pi where pi.id = v_intent.id;
end;
$$;

revoke execute on function public.settle_payment_intent(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.fail_payment_intent(text, text, text)
  from public, anon, authenticated;
grant execute on function
  public.settle_payment_intent(text, text, text),
  public.fail_payment_intent(text, text, text)
to service_role;
