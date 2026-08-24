-- 009a_functions_payments.sql
create or replace function public.create_payment_intent(
  p_creator_user_id uuid,
  p_merchant_id uuid,
  p_wallet_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_reference text,
  p_idempotency_key text,
  p_provider text,
  p_description text,
  p_customer_phone text,
  p_callback_url text,
  p_success_url text,
  p_expires_at timestamptz,
  p_metadata jsonb
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_intent jsonb;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'invalid_amount';
  end if;

  insert into public.payment_intents
    (creator_user_id, merchant_id, wallet_id, amount_minor, currency, reference,
     idempotency_key, provider, description, customer_phone, callback_url,
     success_url, expires_at, metadata)
  values
    (p_creator_user_id, p_merchant_id, p_wallet_id, p_amount_minor, p_currency, p_reference,
     p_idempotency_key, p_provider, p_description, p_customer_phone, p_callback_url,
     p_success_url, p_expires_at, p_metadata)
  returning to_jsonb(pi.*) into v_intent
  from payment_intents pi where pi.id = payment_intents.id;

  return v_intent;
exception
  when unique_violation then
    select to_jsonb(pi) into v_intent from public.payment_intents pi
      where pi.idempotency_key = p_idempotency_key limit 1;
    if v_intent is not null then return v_intent; end if;
    raise;
end;
$$;

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