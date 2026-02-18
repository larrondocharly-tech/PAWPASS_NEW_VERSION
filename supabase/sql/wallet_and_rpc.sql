-- Wallets + wallet_transactions + RLS + safer atomic RPC (P0 hardening)

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('EARN', 'SPEND')),
  amount numeric not null check (amount > 0),
  source_transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

-- transactions table is created elsewhere; we only patch columns/indexes here
alter table public.transactions
  add column if not exists wallet_spent numeric not null default 0;

-- ✅ idempotency (minimal) for retry/double-click safety
alter table public.transactions
  add column if not exists idempotency_key text;

create unique index if not exists transactions_user_idempo_unique
  on public.transactions (user_id, idempotency_key)
  where idempotency_key is not null;

-- ✅ wallet invariants
alter table public.wallets
  add constraint if not exists wallets_balance_non_negative
  check (balance >= 0);

-- ✅ indexes for perf + traceability
create index if not exists wallet_tx_user_created_at
  on public.wallet_transactions (user_id, created_at desc);

create index if not exists wallet_tx_source_transaction_id
  on public.wallet_transactions (source_transaction_id);

-- ✅ anti-duplicate ledger lines per transaction/type (when source_transaction_id exists)
create unique index if not exists wallet_tx_unique_per_tx_type
  on public.wallet_transactions (source_transaction_id, type)
  where source_transaction_id is not null;

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;

-- -----------------------------
-- RLS policies (READ-ONLY client)
-- -----------------------------

do $$ begin
  create policy "wallets_select_own" on public.wallets
    for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ❌ REMOVE dangerous direct updates from client
drop policy if exists "wallets_update_own" on public.wallets;

do $$ begin
  create policy "wallet_transactions_select_own" on public.wallet_transactions
    for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ❌ REMOVE dangerous direct inserts from client
drop policy if exists "wallet_transactions_insert_own" on public.wallet_transactions;

-- -----------------------------
-- Safer RPC (locks + idempotency)
-- -----------------------------
create or replace function public.apply_cashback_transaction(
  p_merchant_code text,
  p_amount numeric,
  p_spa_id uuid,
  p_donate_cashback boolean,
  p_use_reduction boolean,
  p_reduction_amount numeric,
  p_idempotency_key text default null
)
returns table (
  id uuid,
  donation_amount numeric,
  cashback_total numeric,
  cashback_to_user numeric,
  wallet_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance numeric := 0;
  v_reduction numeric := 0;
  v_amount_net numeric := 0;
  v_cashback_total numeric := 0;
  v_donation_amount numeric := 0;
  v_cashback_to_user numeric := 0;
  v_tx public.transactions;
  v_merchant_id uuid;
  v_last_tx_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_merchant_code is null or length(trim(p_merchant_code)) = 0 then
    raise exception 'Merchant code required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Invalid amount';
  end if;

  -- Merchant resolution (server-side)
  select id into v_merchant_id
  from public.profiles
  where merchant_code = p_merchant_code
    and lower(role) = 'merchant'
  limit 1;

  if v_merchant_id is null then
    raise exception 'Merchant not found';
  end if;

  -- Minimal idempotency key if none provided
  -- (front will provide a better one; this is a fallback)
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    p_idempotency_key :=
      'scan:' || v_user_id::text || ':' || v_merchant_id::text || ':' || to_char(now(), 'YYYYMMDDHH24MI');
  end if;

  -- Ensure wallet exists
  insert into public.wallets (user_id, balance)
  values (v_user_id, 0)
  on conflict (user_id) do nothing;

  -- ✅ Lock wallet row to prevent race conditions
  select balance into v_balance
  from public.wallets
  where user_id = v_user_id
  for update;

  v_balance := coalesce(v_balance, 0);

  -- (Optional legacy cooldown - still kept)
  select max(created_at) into v_last_tx_at
  from public.transactions
  where user_id = v_user_id
    and merchant_id = v_merchant_id;

  if v_last_tx_at is not null and (now() - v_last_tx_at) < interval '2 hours' then
    raise exception 'Cooldown active';
  end if;

  -- Reduction rules
  if coalesce(p_use_reduction, false) and coalesce(p_reduction_amount, 0) > 0 then
    if v_balance < 5 then
      raise exception 'Wallet balance below minimum threshold';
    end if;
    if p_reduction_amount > v_balance then
      raise exception 'Reduction exceeds wallet balance';
    end if;
    if p_reduction_amount > p_amount then
      raise exception 'Reduction exceeds amount';
    end if;
    v_reduction := p_reduction_amount;
  end if;

  v_amount_net := p_amount - v_reduction;
  v_cashback_total := round(v_amount_net * 0.05, 2);

  if coalesce(p_donate_cashback, false) then
    v_donation_amount := v_cashback_total;
    v_cashback_to_user := 0;
  else
    v_donation_amount := 0;
    v_cashback_to_user := v_cashback_total;
  end if;

  -- Insert transaction (unique index enforces idempotency)
  insert into public.transactions (
    user_id,
    merchant_id,
    spa_id,
    amount,
    cashback_total,
    donation_amount,
    cashback_to_user,
    wallet_spent,
    idempotency_key
  )
  values (
    v_user_id,
    v_merchant_id,
    p_spa_id,
    p_amount,
    v_cashback_total,
    v_donation_amount,
    v_cashback_to_user,
    v_reduction,
    p_idempotency_key
  )
  returning * into v_tx;

  -- Ledger rows (unique index prevents duplicates for a tx/type)
  if v_cashback_to_user > 0 then
    insert into public.wallet_transactions (user_id, type, amount, source_transaction_id)
    values (v_user_id, 'EARN', v_cashback_to_user, v_tx.id);
  end if;

  if v_reduction > 0 then
    insert into public.wallet_transactions (user_id, type, amount, source_transaction_id)
    values (v_user_id, 'SPEND', v_reduction, v_tx.id);
  end if;

  -- Update wallet (still within locked tx)
  update public.wallets
  set balance = balance + v_cashback_to_user - v_reduction,
      updated_at = now()
  where user_id = v_user_id;

  select balance into v_balance
  from public.wallets
  where user_id = v_user_id;

  return query
    select v_tx.id, v_tx.donation_amount, v_tx.cashback_total, v_tx.cashback_to_user, v_balance;
end;
$$;

-- Update grants for the new signature (7 args)
revoke all on function public.apply_cashback_transaction(
  text, numeric, uuid, boolean, boolean, numeric
) from authenticated;

grant execute on function public.apply_cashback_transaction(
  text,
  numeric,
  uuid,
  boolean,
  boolean,
  numeric,
  text
) to authenticated;
