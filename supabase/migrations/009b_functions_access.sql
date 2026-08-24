-- 009b_functions_access.sql
-- Admin/audit/API-key/notification helper functions.

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role text,
  p_actor uuid
)
returns void language plpgsql volatile security definer
set search_path = public
as $$
begin
  if p_role not in ('customer','merchant','developer','admin') then
    raise exception 'invalid_role';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin') then
    raise exception 'forbidden';
  end if;
  update public.profiles set role = p_role, updated_at = now() where id = p_user_id;
end;
$$;

create or replace function public.create_api_key(
  p_owner_type text,
  p_owner_id uuid,
  p_name text,
  p_key_prefix text,
  p_key_hash text,
  p_scopes text[],
  p_expires_at timestamptz
)
returns public.api_keys language plpgsql volatile security definer
set search_path = public
as $$
declare v_row public.api_keys%rowtype;
begin
  insert into public.api_keys (owner_type, owner_id, name, key_prefix, key_hash, scopes, expires_at)
  values (p_owner_type, p_owner_id, p_name, p_key_prefix, p_key_hash, p_scopes, p_expires_at)
  returning * into v_row;
  return v_row;
end;
$$;

create or replace function public.revoke_api_key(
  p_api_key_id uuid,
  p_owner_type text,
  p_owner_id uuid
)
returns void language plpgsql volatile security definer
set search_path = public
as $$
begin
  update public.api_keys set status='revoked'
   where id = p_api_key_id and owner_type = p_owner_type and owner_id = p_owner_id;
  if not found then raise exception 'api_key_not_found'; end if;
end;
$$;

create or replace function public.touch_api_key_last_used(
  p_key_hash text
)
returns void language sql volatile security definer
set search_path = public
as $$
  update public.api_keys set last_used_at = now() where key_hash = p_key_hash;
$$;

create or replace function public.insert_audit_log(
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_metadata jsonb,
  p_ip text,
  p_user_agent text
)
returns bigint language plpgsql volatile security definer
set search_path = public
as $$
declare v_id bigint;
begin
  insert into public.audit_logs
    (actor_user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
  values (p_actor_user_id, p_action, p_entity_type, p_entity_id, p_metadata, p_ip, p_user_agent)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.mark_notification_read(
  p_notification_id bigint,
  p_user_id uuid
)
returns void language plpgsql volatile security definer
set search_path = public
as $$
begin
  update public.notifications set read_at = now()
   where id = p_notification_id and user_id = p_user_id;
end;
$$;