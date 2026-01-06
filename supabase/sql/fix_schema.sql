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

alter table public.profiles
  add column if not exists role text default 'user';

alter table public.profiles
  alter column role set default 'user';

update public.profiles
set role = 'merchant'
where lower(role) in ('merchant', 'commercant', 'commerçant');

update public.profiles
set role = 'user'
where role is null
   or lower(role) in ('user', 'client');

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'merchant'));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  v_role := lower(coalesce(new.raw_user_meta_data->>'role', 'user'));

  if v_role not in ('user', 'merchant') then
    v_role := 'user';
  end if;

  insert into public.profiles (id, role)
  values (new.id, v_role)
  on conflict (id) do update
    set role = excluded.role;

  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

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

create unique index if not exists profiles_merchant_code_unique
  on public.profiles (merchant_code)
  where merchant_code is not null;
