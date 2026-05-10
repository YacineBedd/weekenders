-- Weekender — Supabase schema
-- Run this once in your Supabase project's SQL editor.
-- Trust model: open shared workspace. Anyone with the URL + anon key can
-- read and write. Fine for a small private group; treat the deployed link
-- like a shared Google Doc.

create table if not exists profiles (
  id           text primary key,
  name         text not null,
  color        text,
  created_at   timestamptz default now()
);

create table if not exists visits (
  id            text primary key,
  restaurant_id text not null,
  profile_id    text references profiles(id) on delete cascade,
  date          bigint not null,
  rating        numeric,
  thumbs        text,
  note          text,
  best_dish     text,
  with_who      text,
  would_return  boolean,
  created_at    timestamptz default now()
);

create table if not exists wishlist (
  restaurant_id text not null,
  profile_id    text references profiles(id) on delete cascade,
  added_at      bigint not null,
  primary key (restaurant_id, profile_id)
);

create table if not exists tiers (
  profile_id    text references profiles(id) on delete cascade,
  restaurant_id text not null,
  tier_key      text not null,
  primary key (profile_id, restaurant_id)
);

create table if not exists meta (
  key   text primary key,
  value text
);

alter table profiles enable row level security;
alter table visits   enable row level security;
alter table wishlist enable row level security;
alter table tiers    enable row level security;
alter table meta     enable row level security;

drop policy if exists "open" on profiles;
drop policy if exists "open" on visits;
drop policy if exists "open" on wishlist;
drop policy if exists "open" on tiers;
drop policy if exists "open" on meta;

create policy "open" on profiles for all using (true) with check (true);
create policy "open" on visits   for all using (true) with check (true);
create policy "open" on wishlist for all using (true) with check (true);
create policy "open" on tiers    for all using (true) with check (true);
create policy "open" on meta     for all using (true) with check (true);

alter publication supabase_realtime add table profiles, visits, wishlist, tiers, meta;
