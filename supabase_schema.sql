-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  home_gym text,
  boulder_system text,
  rope_system text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Climbs table
create table public.climbs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  grade text not null,
  gym text not null,
  type text not null,
  date date not null,
  time_text text, -- Stored as simple text, e.g. "10:30 AM"
  duration_minutes integer, -- Stored as integer minutes
  status text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Saved Gyms table
create table public.saved_gyms (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  gym_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, gym_name)
);

-- RLS Policies
alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

alter table public.climbs enable row level security;
create policy "Users can view own climbs" on climbs for select using (auth.uid() = user_id);
create policy "Users can insert own climbs" on climbs for insert with check (auth.uid() = user_id);
create policy "Users can update own climbs" on climbs for update using (auth.uid() = user_id);
create policy "Users can delete own climbs" on climbs for delete using (auth.uid() = user_id);

alter table public.saved_gyms enable row level security;
create policy "Users can view own saved gyms" on saved_gyms for select using (auth.uid() = user_id);
create policy "Users can insert own saved gyms" on saved_gyms for insert with check (auth.uid() = user_id);
create policy "Users can delete own saved gyms" on saved_gyms for delete using (auth.uid() = user_id);
