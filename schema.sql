
-- আল ইখওয়ান ইসলামী সংস্থা বাংলাদেশ
-- Supabase/PostgreSQL schema
-- Foundation year is configurable in organization_settings.

create extension if not exists pgcrypto;

create table if not exists public.organization_settings (
  id boolean primary key default true,
  organization_name text not null default 'আল ইহওয়ান ইসলামী সংস্থা বাংলাদেশ',
  foundation_year integer not null default 2020,
  monthly_due numeric(12,2) not null default 500,
  currency text not null default 'BDT',
  updated_at timestamptz not null default now()
);

insert into public.organization_settings(id) values(true)
on conflict (id) do nothing;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_code text not null unique,
  full_name text not null,
  phone text,
  join_date date,
  status text not null default 'active' check(status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  payment_year integer not null,
  payment_month integer not null check(payment_month between 1 and 12),
  amount numeric(12,2) not null default 0 check(amount >= 0),
  paid_at date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(member_id, payment_year, payment_month)
);

create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  entry_year integer not null,
  entry_date date not null default current_date,
  entry_type text not null check(entry_type in ('profit','expense','investment','other_income','other_expense','opening_balance')),
  amount numeric(14,2) not null check(amount >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published boolean not null default true,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin users are identified by their Supabase Auth user id.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Helper
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

-- Public member summary: deliberately contains no phone/password/notes.
create or replace view public.public_member_summary as
select
  m.id,
  m.member_code,
  m.full_name,
  m.status,
  coalesce(sum(p.amount),0)::numeric(14,2) as total_deposit,
  coalesce(sum(
    case when p.payment_year = extract(year from current_date)::int then p.amount else 0 end
  ),0)::numeric(14,2) as current_year_deposit
from public.members m
left join public.member_payments p on p.member_id=m.id
group by m.id, m.member_code, m.full_name, m.status;

-- Lifetime profit allocation based strictly on lifetime deposits.
create or replace view public.public_member_profit as
with totals as (
  select coalesce(sum(amount),0)::numeric(14,2) total_deposit
  from public.member_payments
),
profit as (
  select coalesce(sum(amount),0)::numeric(14,2) total_profit
  from public.financial_entries
  where entry_type='profit'
)
select
  m.id,
  m.member_code,
  m.full_name,
  coalesce(sum(p.amount),0)::numeric(14,2) total_deposit,
  greatest(
    (extract(year from current_date)::int - coalesce(s.foundation_year, extract(year from current_date)::int) + 1)
    * coalesce(s.monthly_due,500)
    - coalesce(sum(p.amount),0),
    0
  )::numeric(14,2) as current_year_style_arrears,
  case when t.total_deposit > 0
    then (coalesce(sum(p.amount),0) / t.total_deposit * pr.total_profit)
    else 0 end::numeric(14,2) as entitled_profit
from public.members m
cross join public.organization_settings s
cross join totals t
cross join profit pr
left join public.member_payments p on p.member_id=m.id
group by m.id,m.member_code,m.full_name,t.total_deposit,pr.total_profit,s.foundation_year,s.monthly_due;

-- Yearly report view. Balance = deposits + other income + profit + opening balance
-- minus expenses and investments. Investment is shown separately and deducted from cash balance.
create or replace view public.public_yearly_report as
with years as (
  select generate_series(
    (select foundation_year from public.organization_settings),
    extract(year from current_date)::int
  )::int as year
),
dep as (
  select payment_year year, coalesce(sum(amount),0) deposits
  from public.member_payments group by payment_year
),
fin as (
  select entry_year year,
    coalesce(sum(amount) filter(where entry_type='profit'),0) profit,
    coalesce(sum(amount) filter(where entry_type='expense'),0) expense,
    coalesce(sum(amount) filter(where entry_type='investment'),0) investment,
    coalesce(sum(amount) filter(where entry_type='other_income'),0) other_income,
    coalesce(sum(amount) filter(where entry_type='other_expense'),0) other_expense,
    coalesce(sum(amount) filter(where entry_type='opening_balance'),0) opening_balance
  from public.financial_entries group by entry_year
)
select
  y.year,
  (select count(*) from public.members where status='active')::int total_members,
  coalesce(d.deposits,0)::numeric(14,2) total_deposit,
  greatest(
    ((extract(year from current_date)::int - y.year + 1) * (select monthly_due from public.organization_settings) *
      (select count(*) from public.members where status='active'))
    - coalesce(d.deposits,0), 0
  )::numeric(14,2) total_arrears,
  coalesce(f.investment,0)::numeric(14,2) total_investment,
  coalesce(f.profit,0)::numeric(14,2) total_profit,
  coalesce(f.expense,0)::numeric(14,2) total_expense,
  (
    coalesce(d.deposits,0)+coalesce(f.profit,0)+coalesce(f.other_income,0)+coalesce(f.opening_balance,0)
    -coalesce(f.expense,0)-coalesce(f.other_expense,0)-coalesce(f.investment,0)
  )::numeric(14,2) balance
from years y
left join dep d on d.year=y.year
left join fin f on f.year=y.year
order by y.year;

-- Public notices
create or replace view public.public_notices as
select id,title,body,published,published_at,created_at
from public.notices
where published=true
order by coalesce(published_at,created_at) desc;

-- RLS
alter table public.organization_settings enable row level security;
alter table public.members enable row level security;
alter table public.member_payments enable row level security;
alter table public.financial_entries enable row level security;
alter table public.notices enable row level security;
alter table public.admin_users enable row level security;

-- Admin full access to base tables.
create policy "admin settings" on public.organization_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "admin members" on public.members for all using (public.is_admin()) with check (public.is_admin());
create policy "admin payments" on public.member_payments for all using (public.is_admin()) with check (public.is_admin());
create policy "admin financial" on public.financial_entries for all using (public.is_admin()) with check (public.is_admin());
create policy "admin notices" on public.notices for all using (public.is_admin()) with check (public.is_admin());
create policy "admin users self" on public.admin_users for select using (auth.uid()=user_id);
create policy "admin users insert" on public.admin_users for insert with check (auth.uid()=user_id and public.is_admin());

-- Public views need SELECT grants. Base member tables are not granted to anon.
grant select on public.public_member_summary to anon, authenticated;
grant select on public.public_member_profit to anon, authenticated;
grant select on public.public_yearly_report to anon, authenticated;
grant select on public.public_notices to anon, authenticated;
grant select on public.organization_settings to anon, authenticated;

-- Optional: enable realtime later if desired.
-- alter publication supabase_realtime add table public.member_payments, public.notices;
