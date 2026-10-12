-- ETUZA HUB – Initial Schema
-- Run this in Supabase SQL Editor

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  preferred_language text default 'sw' check (preferred_language in ('sw', 'en')),
  created_at timestamptz default now()
);

-- Content (movies, games, vpn)
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('movie', 'game', 'vpn')),
  title text not null,
  description text,
  cover_url text,
  link_url text not null,
  link_type text not null check (link_type in ('download', 'stream')),
  category text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- VPN specific
  protocol text,
  country text,
  network text,
  config_text text,
  file_url text,
  brand_logo_url text,
  -- metadata
  tmdb_id integer,
  views_count integer default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User interactions for recommendations
create table if not exists public.user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  content_id uuid references public.content(id) on delete cascade,
  action text check (action in ('view', 'download', 'stream', 'copy')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_content_type_status on public.content(type, status);
create index if not exists idx_content_category on public.content(category);
create index if not exists idx_interactions_user on public.user_interactions(user_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.user_interactions enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Content policies
create policy "Anyone can read published content"
  on public.content for select using (status = 'published');

create policy "Admins can do everything on content"
  on public.content for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Interactions
create policy "Users can insert own interactions"
  on public.user_interactions for insert with check (auth.uid() = user_id);

create policy "Users can read own interactions"
  on public.user_interactions for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger content_updated_at
  before update on public.content
  for each row execute procedure public.set_updated_at();
