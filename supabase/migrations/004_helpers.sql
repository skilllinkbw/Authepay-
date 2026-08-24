-- 004_helpers.sql
-- Security-definer helper functions for RLS policy reuse.
-- These bypass RLS internally to avoid recursion while keeping policy logic
-- tightly defined in one place.

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_wallet_owner(p_wallet_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.wallets w
    where w.id = p_wallet_id
      and w.owner_type = 'user'
      and w.owner_id = auth.uid()
  );
$$;

create or replace function public.is_wallet_accessible(p_wallet_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from public.wallets w
    where w.id = p_wallet_id
      and (
        (w.owner_type = 'user' and w.owner_id = auth.uid())
        or (w.owner_type = 'merchant'
            and exists(select 1 from public.merchants m
                       where m.id = w.owner_id and m.owner_id = auth.uid()))
        or public.is_admin()
      )
  );
$$;