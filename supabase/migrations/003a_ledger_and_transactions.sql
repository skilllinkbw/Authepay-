-- 003a_ledger_and_transactions.sql
create table if not exists public.ledger_entries (
  id              bigint generated always as identity primary key,
  wallet_id        uuid not null references public.wallets(id) on delete restrict,
  direction        text not null check (direction in ('credit','debit')),
  amount_minor     bigint not null check (amount_minor > 0),
  balance_after_minor bigint not null,
  reason            text not null,
  reference         text not null,
  transaction_id    uuid,
  created_at        timestamptz not null default now(),
  unique (reference, wallet_id)
);
create index if not exists ledger_wallet_created_idx
  on public.ledger_entries (wallet_id, created_at desc);

create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  type             text not null check (type in ('deposit','withdrawal','payment','refund','transfer','topup')),
  status           text not null default 'pending'
                    check (status in ('pending','processing','succeeded','failed','cancelled','refunded','partially_refunded')),
  amount_minor     bigint not null check (amount_minor > 0),
  currency          text not null default 'BWP',
  reference         text not null unique,
  idempotency_key  text unique,
  from_wallet_id    uuid references public.wallets(id) on delete set null,
  to_wallet_id      uuid references public.wallets(id) on delete set null,
  description        text,
  provider        text,
  provider_reference text,
  error_message      text,
  metadata          jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz
);
create index if not exists transactions_from_wallet_idx on public.transactions (from_wallet_id);
create index if not exists transactions_created_idx on public.transactions (created_at desc);

create table if not exists public.transaction_events (
  id              bigint generated always as identity primary key,
  transaction_id   uuid not null references public.transactions(id) on delete cascade,
  from_status       text,
  to_status         text not null,
  reason          text,
  actor            text,
  created_at         timestamptz not null default now()
);

create table if not exists public.payment_intents (
  id                 uuid primary key default gen_random_uuid(),
  creator_user_id    uuid references public.profiles(id) on delete set null,
  merchant_id         uuid references public.merchants(id) on delete set null,
  wallet_id           uuid references public.wallets(id) on delete set null,
  amount_minor        bigint not null check (amount_minor > 0),
  currency            text not null default 'BWP',
  status              text not null default 'pending'
                        check (status in ('pending','processing','succeeded','failed','cancelled')),
  reference           text not null unique,
  idempotency_key     text unique,
  provider            text not null,
  provider_reference text,
  description         text,
  customer_phone     text,
  callback_url       text,
  success_url          text,
  expires_at           timestamptz,
  metadata             jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists payment_intents_merchant_idx on public.payment_intents (merchant_id);
create index if not exists payment_intents_reference_idx on public.payment_intents (reference);