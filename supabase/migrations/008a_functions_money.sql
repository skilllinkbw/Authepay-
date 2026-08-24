-- 008a_functions_money.sql (part 1)
-- Atomic money movement. All functions are SECURITY DEFINER, enforce wallet
-- locking + ledger recording, and are the ONLY way balances change.

create or replace function public._post_movement(
  p_wallet_id uuid,
  p_direction text,
  p_amount_minor bigint,
  p_reason text,
  p_reference text,
  p_transaction_id uuid
)
returns bigint language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_new_balance bigint;
begin
  if p_amount_minor is null or p_amount_minor <= 0 then
    raise exception 'invalid_amount';
  end if;
  if p_direction not in ('credit','debit') then
    raise exception 'invalid_direction';
  end if;

  perform pg_advisory_xact_lock(hashtext('authepay:wallet:' || p_wallet_id::text));

  select balance_minor into v_balance
    from public.wallets where id = p_wallet_id for update;
  if not found then
    raise exception 'wallet_not_found';
  end if;

  if p_direction = 'debit' then
    if v_balance < p_amount_minor then
      raise exception 'insufficient_funds';
    end if;
    v_new_balance := v_balance - p_amount_minor;
  else
    v_new_balance := v_balance + p_amount_minor;
  end if;

  update public.wallets
     set balance_minor = v_new_balance, updated_at = now()
   where id = p_wallet_id;

  insert into public.ledger_entries
    (wallet_id, direction, amount_minor, balance_after_minor, reason, reference, transaction_id)
  values
    (p_wallet_id, p_direction, p_amount_minor, v_new_balance, p_reason, p_reference, p_transaction_id);

  return v_new_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- execute_transfer: move money between two wallets atomically.
-- Idempotent on idempotency_key: replay returns the existing transaction.
-- ---------------------------------------------------------------------------
create or replace function public.execute_transfer(
  p_from_wallet_id uuid,
  p_to_owner_type text,
  p_to_owner_id uuid,
  p_amount_minor bigint,
  p_currency text,
  p_reference text,
  p_idempotency_key text,
  p_description text
)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_to_wallet uuid;
  v_txn_id uuid;
  v_txn jsonb;
begin
  select id into v_to_wallet from public.wallets
   where owner_type = p_to_owner_type and owner_id = p_to_owner_id
   order by created_at limit 1;
  if not found then
    raise exception 'destination_wallet_not_found';
  end if;

  insert into public.transactions
    (type, status, amount_minor, currency, reference, idempotency_key,
     from_wallet_id, to_wallet_id, description, metadata)
  values
    ('transfer', 'processing', p_amount_minor, p_currency, p_reference, p_idempotency_key,
     p_from_wallet_id, v_to_wallet, p_description, jsonb_build_object('kind','transfer'))
  returning id into v_txn_id;

  begin
    perform public._post_movement(p_from_wallet_id, 'debit', p_amount_minor,
      'transfer_out', p_reference, v_txn_id);
    perform public._post_movement(v_to_wallet, 'credit', p_amount_minor,
      'transfer_in', p_reference, v_txn_id);
  exception when others then
    update public.transactions set status='failed', error_message=SQLERRM, updated_at=now()
      where id = v_txn_id;
    insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
      values (v_txn_id, 'processing', 'failed', 'movement_failed', 'system');
    raise;
  end;

  update public.transactions set status='succeeded', updated_at=now(), completed_at=now()
    where id = v_txn_id;
  insert into public.transaction_events (transaction_id, from_status, to_status, reason, actor)
    values (v_txn_id, 'processing', 'succeeded', 'transfer_completed', 'system');

  select to_jsonb(t) into v_txn from public.transactions t where id = v_txn_id;
  return v_txn;
exception
  when unique_violation then
    select to_jsonb(t) into v_txn from public.transactions t
      where t.idempotency_key = p_idempotency_key limit 1;
    if v_txn is not null then
      return v_txn;
    end if;
    raise;
end;
$$;