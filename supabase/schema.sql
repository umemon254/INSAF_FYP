-- INSAF database setup (Supabase).
-- This matches the live database. Run it once on a new, empty Supabase project:
-- Dashboard > SQL Editor > New query > paste > Run.

-- 1. Tables

-- One row for every confirmed account. Passwords are not stored here,
-- Supabase Auth keeps them hashed in auth.users.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now()
);

-- Users in this table are admins. Rows are added by hand in the SQL Editor.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- The full lawyer application, including private data (CNIC).
create table public.lawyer_applications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  cnic text,
  cnic_path text,
  province text,
  bar_council_id text not null,
  specializations text[] not null,
  picture_path text,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz default now(),

  constraint lawyer_applications_status_check
    check (status in ('pending', 'approved', 'rejected', 'blocked')),
  constraint app_name_letters check (full_name ~ '^[A-Za-z][A-Za-z .''-]{1,49}$'),
  constraint app_phone_11 check (phone ~ '^[0-9]{11}$'),
  constraint app_cnic_format check (cnic is null or cnic ~ '^[0-9]{5}-[0-9]{7}-[0-9]$'),
  constraint app_bar_format check (bar_council_id ~ '^[A-Za-z0-9/-]{3,20}$'),
  constraint app_province_valid check (province is null or province in
    ('Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad', 'Gilgit-Baltistan')),
  -- the same Bar Council ID can't be used twice in one province
  constraint app_bar_unique unique (province, bar_council_id)
);

-- Public list of approved lawyers, without CNIC. The admin adds a row on approve
-- and deletes it on reject, block or remove.
create table public.lawyer_directory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  specializations text[] not null,
  picture_path text,

  constraint dir_follows_application foreign key (user_id)
    references public.lawyer_applications(user_id) on delete cascade,
  constraint dir_name_letters check (full_name ~ '^[A-Za-z][A-Za-z .''-]{1,49}$'),
  constraint dir_phone_11 check (phone ~ '^[0-9]{11}$')
);

-- 2. Functions and triggers

-- Creates the profile once the email is confirmed (with the code from sign up).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email_confirmed_at is not null then
    begin
      insert into public.profiles(id, email, full_name)
      values (new.id, new.email, new.raw_user_meta_data->>'full_name')
      on conflict (id) do nothing;
    exception when others then
      raise warning 'profile insert failed: %', sqlerrm;
    end;
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();

-- Used by the policies. "security definer" lets it read admins past RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable security definer set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- A lawyer can edit their directory row, but not their id, name or email.
create or replace function public.lock_directory_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then return new; end if;   -- admin edits in the Supabase dashboard are allowed
  new.user_id := old.user_id;
  new.full_name := old.full_name;
  new.email := old.email;
  return new;
end $$;

create trigger directory_lock
  before update on public.lawyer_directory
  for each row execute function public.lock_directory_columns();

-- When a lawyer edits phone, specializations or picture, copy it to their application too.
create or replace function public.sync_application_from_directory()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update lawyer_applications
  set phone = new.phone,
      specializations = new.specializations,
      picture_path = new.picture_path
  where user_id = new.user_id;
  return new;
end $$;

create trigger directory_sync
  after update on public.lawyer_directory
  for each row execute function public.sync_application_from_directory();

-- 3. Row Level Security

alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.lawyer_applications enable row level security;
alter table public.lawyer_directory enable row level security;

-- profiles: no insert or update policy, so nobody can change a profile from the app.
create policy "own profile or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- admins: a user can only check their own row (used at login).
create policy "check own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- lawyer_applications
create policy "submit own application" on public.lawyer_applications
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

create policy "read own application or admin" on public.lawyer_applications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- the user can fix a pending application, but can't change its status
create policy "edit pending application" on public.lawyer_applications
  for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');

-- after a rejection the user can apply again, only as pending
create policy "reapply after rejection" on public.lawyer_applications
  for update to authenticated
  using (user_id = auth.uid() and status = 'rejected')
  with check (user_id = auth.uid() and status = 'pending');

create policy "admin decides" on public.lawyer_applications
  for update to authenticated using (public.is_admin());

create policy "admin deletes application" on public.lawyer_applications
  for delete to authenticated using (public.is_admin());

-- lawyer_directory
create policy "anyone logged in sees lawyers" on public.lawyer_directory
  for select to authenticated using (true);

create policy "admin adds lawyer" on public.lawyer_directory
  for insert to authenticated with check (public.is_admin());

create policy "admin removes lawyer" on public.lawyer_directory
  for delete to authenticated using (public.is_admin());

create policy "lawyer edits own directory row" on public.lawyer_directory
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4. Storage
-- Pictures are public so the directory can show them. CNIC files are private.
-- Every file goes in a folder named after the user id: "<user id>/<time>-pic".

insert into storage.buckets (id, name, public) values
  ('lawyer-pictures', 'lawyer-pictures', true),
  ('cnic-images', 'cnic-images', false);

create policy "upload own picture" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'lawyer-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "update own picture" on storage.objects
  for update to authenticated
  using (bucket_id = 'lawyer-pictures' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admin deletes pictures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'lawyer-pictures' and public.is_admin());

create policy "upload own cnic" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cnic-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admin reads cnic" on storage.objects
  for select to authenticated
  using (bucket_id = 'cnic-images' and public.is_admin());

create policy "admin deletes cnic" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cnic-images' and public.is_admin());

-- 5. Make someone admin: sign up in the app first, then run this with their email.
-- insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
