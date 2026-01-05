-- Minimal RLS policies for PawPass MVP

create table if not exists public.spas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  region text,
  created_at timestamptz default now()
);

alter table public.spas enable row level security;

do $$ begin
  create policy "spas_select_authenticated" on public.spas
    for select
    to authenticated
    using (true);
exception when duplicate_object then null;
end $$;

alter table public.profiles enable row level security;

do $$ begin
  create policy "profiles_select_own" on public.profiles
    for select
    to authenticated
    using (auth.uid() = id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "profiles_update_own" on public.profiles
    for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception when duplicate_object then null;
end $$;

alter table public.transactions enable row level security;

do $$ begin
  create policy "transactions_select_own" on public.transactions
    for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;
