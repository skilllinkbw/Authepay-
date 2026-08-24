-- 002_identity.sql  (profiles, merchants, wallets)
-- Money is integer minor units (`*_minor bigint`). No float anywhere.

create table if not exists public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  phone                text,
  role                 text not null default 'customer'
                         check (role in ('customer','merchant','developer','admin')),
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.merchants (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  slug        text unique,
  description text,
  status      text not null default 'active'
                check (status in ('active','suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.wallets (
  id             uuid primary key default gen_random_uuid(),
  owner_type     text not null check (owner_type in ('user','merchant')),
  owner_id       uuid not null,
  currency       text not null default 'BWP',
  balance_minor  bigint not null default 0 check (balance_minor >= 0),
  status         text not null default 'active'
                   check (status in ('active','frozen','closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (owner_type, owner_id)
);