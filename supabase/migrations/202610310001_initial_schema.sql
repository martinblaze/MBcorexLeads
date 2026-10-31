create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  category text,
  country text not null default 'Nigeria',
  state text,
  city text,
  address text,
  phone text,
  email text,
  website text,
  google_business_url text,
  source_name text,
  source_url text,
  discovered_at timestamptz not null default now(),
  notes text,
  outreach_status text not null default 'New' check (outreach_status in ('New','Message prepared','Contacted','Replied','Interested','Call requested','Meeting booked','Proposal sent','Client won','Not interested','Follow-up required','Opted out')),
  last_contact_at timestamptz,
  next_follow_up date,
  contact_preferences jsonb not null default '{}'::jsonb,
  opted_out boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists businesses_name_lower_idx on public.businesses (lower(name));
create index if not exists businesses_phone_idx on public.businesses (phone);
create index if not exists businesses_owner_idx on public.businesses (owner_id);
create index if not exists businesses_status_idx on public.businesses (outreach_status);
create index if not exists businesses_follow_up_idx on public.businesses (next_follow_up) where next_follow_up is not null;

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('message_prepared','message_sent','reply','note','call','meeting','proposal','status_change')),
  body text not null default '',
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists interactions_business_time_idx on public.interactions (business_id, occurred_at desc);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null,
  body text not null,
  is_immutable_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.interactions enable row level security;
alter table public.message_templates enable row level security;
create policy "owners manage businesses" on public.businesses for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "owners manage interactions" on public.interactions for all to authenticated using (exists (select 1 from public.businesses b where b.id = interactions.business_id and b.owner_id = (select auth.uid()))) with check (exists (select 1 from public.businesses b where b.id = interactions.business_id and b.owner_id = (select auth.uid())));
create policy "owners manage templates" on public.message_templates for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.businesses to authenticated;
grant select, insert, update, delete on public.interactions to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
