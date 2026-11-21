-- Appointment booking. Run this once in Supabase: SQL Editor > New query > paste > Run.
--
-- Flow: a user books -> 'pending'. The lawyer accepts or rejects it.
-- An accepted appointment can later be marked 'completed'.
-- Both sides can cancel while it is pending or accepted.

create table public.appointments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,     -- who booked
  lawyer_id uuid not null references auth.users(id) on delete cascade,   -- which lawyer
  appointment_at timestamptz not null,
  consultation_type text not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz default now(),

  constraint appt_type check (consultation_type in ('In-person', 'Phone call')),
  constraint appt_reason_length check (char_length(reason) between 3 and 300),
  constraint appt_status check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed')),
  constraint appt_not_self check (user_id <> lawyer_id)
);

-- A lawyer can't have two accepted appointments at the same time
create unique index appt_no_double_booking on public.appointments (lawyer_id, appointment_at)
  where status = 'accepted';

-- After booking, only the status can change. Same idea as lock_directory_columns.
create or replace function public.lock_appointment_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then return new; end if;   -- edits in the Supabase dashboard are allowed
  new.user_id := old.user_id;
  new.lawyer_id := old.lawyer_id;
  new.appointment_at := old.appointment_at;
  new.consultation_type := old.consultation_type;
  new.reason := old.reason;
  new.created_at := old.created_at;
  return new;
end $$;

create trigger appointment_lock
  before update on public.appointments
  for each row execute function public.lock_appointment_columns();

alter table public.appointments enable row level security;

-- book only for yourself, only as pending, only in the future, only with an approved lawyer
create policy "book own appointment" on public.appointments
  for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'pending' and appointment_at > now()
    and exists (select 1 from public.lawyer_directory d where d.user_id = lawyer_id)
  );

-- the user and the lawyer see their own appointments, nobody else does
create policy "see own appointments" on public.appointments
  for select to authenticated
  using (user_id = auth.uid() or lawyer_id = auth.uid());

-- the user can only cancel, and only while it is still pending or accepted
create policy "user cancels appointment" on public.appointments
  for update to authenticated
  using (user_id = auth.uid() and status in ('pending', 'accepted'))
  with check (user_id = auth.uid() and status = 'cancelled');

-- the lawyer accepts, rejects, cancels or completes their own appointments.
-- Rejected, cancelled and completed ones can't be changed again.
create policy "lawyer updates appointment" on public.appointments
  for update to authenticated
  using (lawyer_id = auth.uid() and status in ('pending', 'accepted'))
  with check (lawyer_id = auth.uid() and status in ('accepted', 'rejected', 'cancelled', 'completed'));

-- a lawyer can read the name and email of users who booked with them
create policy "lawyer sees own clients" on public.profiles
  for select to authenticated
  using (exists (select 1 from public.appointments a where a.user_id = profiles.id and a.lawyer_id = auth.uid()));
