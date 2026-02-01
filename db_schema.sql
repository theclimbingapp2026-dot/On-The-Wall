-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  home_gym text,
  boulder_system text check (boulder_system in ('V-Scale', 'Font')),
  rope_system text check (rope_system in ('YDS', 'French', 'UIAA')),
  onboarding_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Create climbs table
create table public.climbs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  grade text not null,
  gym text not null,
  type text not null,
  date text not null,
  time_text text,
  duration_minutes integer,
  status text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for climbs
alter table public.climbs enable row level security;

create policy "Users can view own climbs" on public.climbs
  for select using (auth.uid() = user_id);

create policy "Users can insert own climbs" on public.climbs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own climbs" on public.climbs
  for update using (auth.uid() = user_id);

create policy "Users can delete own climbs" on public.climbs
  for delete using (auth.uid() = user_id);

-- Create saved_gyms table
create table public.saved_gyms (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  gym_name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for saved_gyms
alter table public.saved_gyms enable row level security;

create policy "Users can view own saved gyms" on public.saved_gyms
  for select using (auth.uid() = user_id);

create policy "Users can insert own saved gyms" on public.saved_gyms
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own saved gyms" on public.saved_gyms
  for delete using (auth.uid() = user_id);


-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, home_gym, boulder_system, rope_system, onboarding_completed)
  values (new.id, null, null, 'V-Scale', 'YDS', false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call handle_new_user on auth.users insert
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Migration to add username column (Safe to run if column already exists)
/*
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
ON public.profiles (lower(username))
WHERE username IS NOT NULL;
*/
