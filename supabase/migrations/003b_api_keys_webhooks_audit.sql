-- 003b_api_keys_webhooks_audit.sql
create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  owner_type  text not null check (owner_type in ('user','merchant')),
  owner_id    uuid not null,
  name        text not null,
  key_prefix  text not null,
  key_hash  text not null unique,
  scopes      text[] not null default '{}',
  status      text not null default 'active' check (status in ('active','revoked')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_owner_idx on public.api_keys (owner_type, owner_id);

create table if not exists public.webhook_endpoints (
  id        uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user','merchant')),
  owner_id uuid not null,
  url      text not null,
  events   text[] not null default '{}',
  secret   text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  endpoint_id  uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_type   text not null,
  payload      jsonb not null,
  signature    text not null,
  status       text not null default 'pending'
                          check (status in ('pending','delivered','failed')),
  attempts      int not null default 0,
  next_retry_at timestamptz,
  response_status int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.provider_webhook_events (
  id          bigint generated always as identity primary key,
  provider    text not null,
  event_id   text not null,
  event_type text,
  raw_payload jsonb not null,
  processed   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_user_id uuid,
  action       text not null,
  entity_type text,
  entity_id     text,
  metadata     jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

create table if not exists public.notifications (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  type      text not null,
  title     text not null,
  body      text,
  read_at  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);