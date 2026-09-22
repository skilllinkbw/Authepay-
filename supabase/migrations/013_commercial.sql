-- 013_commercial.sql
-- Commercial subscription state per account. Plans/limits are defined in
-- lib/commercial/plans.ts (application source of truth); this table stores
-- only each account's current plan and status.
--
-- Writes are admin-only via the set_subscription RPC; owners can read their
-- own row. Financial API routes enforce status server-side.

create table if not exists public.subscriptions (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  plan               text not null default 'trial'
                     check (plan in ('trial','growth','scale')),
  status             text not null default 'trialing'
                     check (status in ('trialing','active','past_due','suspended','cancelled')),
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Provision a trialing subscription for every new profile.
create or replace function public.provision_subscription()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'trial', 'trialing', now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_subscription on public.profiles;
create trigger on_profile_created_subscription
  after insert on public.profiles
  for each row execute function public.provision_subscription();

-- Backfill accounts created before this migration.
insert into public.subscriptions (user_id, plan, status, trial_ends_at)
select p.id, 'trial', 'trialing', now() + interval '14 days'
from public.profiles p
on conflict (user_id) do nothing;

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());

-- No client writes: plan/status changes flow through set_subscription only.
revoke insert, update, delete on public.subscriptions from authenticated;
revoke insert, update, delete on public.subscriptions from anon;

-- Admin-only subscription management (mirrors set_user_role authorization).
create or replace function public.set_subscription(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_actor uuid
)
returns public.subscriptions language plpgsql volatile security definer
set search_path = public
as $$
declare v_row public.subscriptions%rowtype;
begin
  if p_plan not in ('trial','growth','scale') then
    raise exception 'invalid_plan';
  end if;
  if p_status not in ('trialing','active','past_due','suspended','cancelled') then
    raise exception 'invalid_status';
  end if;
  if not exists (select 1 from public.profiles where id = p_actor and role = 'admin') then
    raise exception 'forbidden';
  end if;

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (
    p_user_id,
    p_plan,
    p_status,
    case when p_status = 'trialing' then now() + interval '14 days' else null end
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = excluded.status,
    trial_ends_at = excluded.trial_ends_at,
    updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_subscription(uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.set_subscription(uuid, text, text, uuid)
  to service_role;
