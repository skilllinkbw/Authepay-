-- 008b_functions_money.sql (part 2)
-- Single-wallet movements and refunds. All SECURITY DEFINER and idempotent.

create or replace function public.apply_credit(
  p_wallet_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_reference text,
  p_idempotency_key text,
  p_description text,
  p_provider text,
  p_provider_reference text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_txn_id uuid;
  v_txn jsonb;
begin
  insert into public.transactions
    (type, status, amount_minor, currency, reference, idempotency_key,
     to_wallet_id, description, provider, provider_reference, metadata)
  values
    ('deposit', 'processing', p_amount_minor, p_currency, p_reference, p_idempotency_key,
     p_wallet_id, p_description, p_provider, p_provider_reference, jsonb_build_object('kind','credit'))
  returning id into v_txn_id;

  perform public._post_movement(p_wallet_id, 'credit', p_amount_minor,
    'deposit', p_reference, v_txn_id);

  update public.transactions set status='succeeded', updated_at=now(), completed_at=now()
    where id = v_txn_id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_txn_id, 'processing', 'succeeded', 'credit_applied', 'system');

  select to_jsonb(t) into v_txn from public.transactions t where id = v_txn_id;
  return v_txn;
exception
  when unique_violation then
    select to_jsonb(t) into v_txn from public.transactions t
      where t.idempotency_key = p_idempotency_key limit 1;
    if v_txn is not null then return v_txn; end if;
    raise;
end;
$$;

create or replace function public.apply_debit(
  p_wallet_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_reference text,
  p_idempotency_key text,
  p_description text,
  p_provider text,
  p_provider_reference text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_txn_id uuid;
  v_txn jsonb;
begin
  insert into public.transactions
    (type, status, amount_minor, currency, reference, idempotency_key,
     from_wallet_id, description, provider, provider_reference, metadata)
  values
    ('withdrawal', 'processing', p_amount_minor, p_currency, p_reference, p_idempotency_key,
     p_wallet_id, p_description, p_provider, p_provider_reference, jsonb_build_object('kind','debit'))
  returning id into v_txn_id;

  perform public._post_movement(p_wallet_id, 'debit', p_amount_minor,
    'withdrawal', p_reference, v_txn_id);

  update public.transactions set status='succeeded', updated_at=now(), completed_at=now()
    where id = v_txn_id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_txn_id, 'processing', 'succeeded', 'debit_applied', 'system');

  select to_jsonb(t) into v_txn from public.transactions t where id = v_txn_id;
  return v_txn;
exception
  when unique_violation then
    select to_jsonb(t) into v_txn from public.transactions t
      where t.idempotency_key = p_idempotency_key limit 1;
    if v_txn is not null then return v_txn; end if;
    raise;
end;
$$;

create or replace function public.apply_refund(
  p_txn_reference text,
  p_amount_minor bigint,
  p_currency text,
  p_ref_reference text,
  p_reason text,
  p_actor text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_orig public.transactions%rowtype;
  v_source_wallet uuid;
  v_txn_id uuid;
  v_txn jsonb;
begin
  select * into v_orig from public.transactions
    where reference = p_txn_reference limit 1;
  if not found then
    raise exception 'transaction_not_found';
  end if;

  if v_orig.status <> 'succeeded' then
    raise exception 'not_refundable';
  end if;

  v_source_wallet := coalesce(v_orig.from_wallet_id, v_orig.to_wallet_id);

  insert into public.transactions
    (type, status, amount_minor, currency, reference, idempotency_key,
     from_wallet_id, to_wallet_id, description, metadata)
  values
    ('refund', 'processing', p_amount_minor, p_currency, p_ref_reference, null,
     null, v_source_wallet, p_reason, jsonb_build_object('refunds', p_txn_reference))
  returning id into v_txn_id;

  perform public._post_movement(v_source_wallet, 'credit', p_amount_minor,
    'refund:' || p_txn_reference, p_ref_reference, v_txn_id);

  update public.transactions
     set status = case when p_amount_minor >= v_orig.amount_minor
                        then 'refunded' else 'partially_refunded' end,
         updated_at = now(), completed_at = now()
   where id = v_orig.id;

  update public.transactions set status='succeeded', updated_at=now(), completed_at=now()
    where id = v_txn_id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_txn_id, 'processing', 'succeeded', 'refund_applied', p_actor);

  select to_jsonb(t) into v_txn from public.transactions t where id = v_txn_id;
  return v_txn;
end;
$$;