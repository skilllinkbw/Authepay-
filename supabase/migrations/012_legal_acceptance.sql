-- 012_legal_acceptance.sql
-- Append-only record of which legal policy versions each user has accepted.
-- Acceptance is written exclusively through a security-definer RPC so the
-- server can validate the policy id/version against the registry before
-- recording; clients cannot write acceptance rows directly.

create table if not exists public.policy_acceptances (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  policy_id      text not null,
  policy_version text not null,
  accepted_at    timestamptz not null default now(),
  ip_address     text,
  user_agent     text,
  unique (user_id, policy_id, policy_version)
);
create index if not exists policy_acceptances_user_idx
  on public.policy_acceptances (user_id);

alter table public.policy_acceptances enable row level security;

-- Users can read their own acceptance records; admins can read all.
drop policy if exists policy_acceptances_select on public.policy_acceptances;
create policy policy_acceptances_select on public.policy_acceptances
  for select using (user_id = auth.uid() or public.is_admin());

-- No client-side insert/update/delete: writes flow through the RPC below,
-- which runs as definer with validation already performed by the API layer.
revoke insert, update, delete on public.policy_acceptances from authenticated;
revoke insert, update, delete on public.policy_acceptances from anon;

create or replace function public.record_policy_acceptance(
  p_user_id uuid,
  p_policy_id text,
  p_policy_version text,
  p_ip text,
  p_user_agent text
)
returns public.policy_acceptances language plpgsql volatile security definer
set search_path = public
as $$
declare v_row public.policy_acceptances%rowtype;
begin
  -- Append-only and idempotent: re-accepting the same version returns the
  -- original record instead of duplicating it.
  insert into public.policy_acceptances
    (user_id, policy_id, policy_version, ip_address, user_agent)
  values (p_user_id, p_policy_id, p_policy_version, p_ip, p_user_agent)
  on conflict (user_id, policy_id, policy_version)
  do update set policy_id = excluded.policy_id -- no-op to surface the row
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.record_policy_acceptance(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.record_policy_acceptance(uuid, text, text, text, text)
  to service_role;
