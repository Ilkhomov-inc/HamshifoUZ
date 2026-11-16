-- ════════════════════════════════════════════════════════════════════════
-- Hamshifo UZ — core schema, Row Level Security, booking RPC
--
-- Security model
--   • The application connects with ONE login role that OWNS these tables.
--     Owner access (no SET ROLE) is used only for server-internal work:
--     session lookup, Google sign-in upsert, rate limiting, demo provisioning.
--   • Every request that touches patient/doctor data runs inside a
--     transaction that does `SET LOCAL ROLE hs_user` (or hs_anon) and
--     `set_config('hs.user_id', <uuid>, true)`. Those roles are NOT owners,
--     so the RLS policies below are enforced by Postgres itself.
--   • RLS is enabled on EVERY table. Tables with no policy for hs_anon /
--     hs_user (sessions, waitlist, rate_limits, _migrations) are
--     deny-all for the app roles by design.
-- ════════════════════════════════════════════════════════════════════════

create schema if not exists hs;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hs_anon') then
    create role hs_anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'hs_user') then
    create role hs_user nologin noinherit;
  end if;
end
$$;

-- The application's login role must be allowed to SET ROLE to the app roles.
grant hs_anon to current_user;
grant hs_user to current_user;

revoke all on schema hs from public;
grant usage on schema hs to hs_anon, hs_user;
-- Postgres grants EXECUTE on new functions to PUBLIC by default; undo that.
alter default privileges in schema hs revoke execute on functions from public;

-- ── Domains ─────────────────────────────────────────────────────────────
create domain hs.specialty as text check (value in (
  'Terapevt','Nevrolog','Kardiolog','LOR','Pediatr','Oftalmolog',
  'Dermatolog','Ginekolog','Travmatolog','Gastroenterolog','Endokrinolog','Urolog'
));
create domain hs.urgency as text check (value in ('routine','soon','emergency'));

-- ── Tables ──────────────────────────────────────────────────────────────
create table hs.users (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text unique,
  email         text unique check (email is null or email = lower(email)),
  full_name     text not null default '' check (char_length(full_name) <= 120),
  phone         text check (phone is null or phone ~ '^\+998[0-9]{9}$'),
  role          text not null default 'patient' check (role in ('patient','doctor')),
  is_demo       boolean not null default false,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create table hs.sessions (
  token_hash  text primary key,               -- sha256(random token); raw token only lives in the cookie
  user_id     uuid not null references hs.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index sessions_user_idx on hs.sessions(user_id);
create index sessions_expires_idx on hs.sessions(expires_at);

create table hs.clinics (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  city       text not null check (city in ('fergana','margilan','kokand')),
  address    text not null,
  phone      text not null,
  created_at timestamptz not null default now()
);

create table hs.doctors (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  clinic_id      uuid not null references hs.clinics(id) on delete cascade,
  user_id        uuid unique references hs.users(id) on delete set null,
  full_name      text not null,
  specialty      hs.specialty not null,
  room           text not null,
  contact_phone  text not null,
  languages      text[] not null default array['uz','ru'],
  slot_minutes   int not null default 20 check (slot_minutes between 10 and 60),
  created_at     timestamptz not null default now()
);
create index doctors_specialty_idx on hs.doctors(specialty);

create table hs.slots (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references hs.doctors(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  unique (doctor_id, starts_at),
  unique (id, doctor_id),                    -- target for the composite FK below
  check (ends_at > starts_at)
);
create index slots_doctor_time_idx on hs.slots(doctor_id, starts_at);

create table hs.appointments (
  id             uuid primary key default gen_random_uuid(),
  slot_id        uuid not null,
  doctor_id      uuid not null,
  patient_id     uuid not null references hs.users(id) on delete cascade,
  patient_name   text not null check (char_length(patient_name) between 2 and 80),
  patient_phone  text not null check (patient_phone ~ '^\+998[0-9]{9}$'),
  symptoms       text not null default '' check (char_length(symptoms) <= 1500),
  ai_specialty   hs.specialty,
  ai_urgency     hs.urgency,
  status         text not null default 'booked'
                 check (status in ('booked','completed','cancelled','no_show')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- the appointment's doctor must be the slot's doctor
  foreign key (slot_id, doctor_id) references hs.slots(id, doctor_id) on delete restrict
);
-- BOOKING INTEGRITY: one slot can have at most one active (non-cancelled)
-- appointment. Concurrent inserts for the same slot serialize on this index;
-- every loser gets unique_violation → "slot just taken".
create unique index appointments_one_active_per_slot
  on hs.appointments(slot_id) where status <> 'cancelled';
create index appointments_patient_idx on hs.appointments(patient_id);
create index appointments_doctor_idx on hs.appointments(doctor_id);

create table hs.visit_notes (
  appointment_id   uuid primary key references hs.appointments(id) on delete cascade,
  doctor_id        uuid not null references hs.doctors(id),
  recommendations  text not null check (char_length(recommendations) between 1 and 4000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table hs.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email) and char_length(email) <= 254),
  locale      text not null default 'uz' check (locale in ('uz','ru','en')),
  consent_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create table hs.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         int not null default 0,
  primary key (key, window_start)
);

-- ── Request context helpers ─────────────────────────────────────────────
-- The server sets hs.user_id with set_config(..., is_local => true) inside
-- the request transaction. App users cannot run SQL, so they cannot forge it.
create function hs.uid() returns uuid
language sql stable
set search_path = pg_catalog, hs
as $$ select nullif(current_setting('hs.user_id', true), '')::uuid $$;

-- Doctor record of the current user (NULL for patients / anonymous).
create function hs.current_doctor_id() returns uuid
language sql stable security definer
set search_path = pg_catalog, hs
as $$
  select d.id
  from hs.doctors d
  join hs.users u on u.id = d.user_id
  where d.user_id = hs.uid() and u.role = 'doctor'
  limit 1
$$;

-- ── Guard triggers ──────────────────────────────────────────────────────
create function hs.appointments_before_insert() returns trigger
language plpgsql
set search_path = pg_catalog, hs
as $$
declare
  v_doctor uuid;
  v_start  timestamptz;
begin
  if hs.uid() is null then
    return new;                          -- server maintenance / seed context
  end if;
  select s.doctor_id, s.starts_at into v_doctor, v_start from hs.slots s where s.id = new.slot_id;
  if v_doctor is null then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;
  if v_start <= now() then
    raise exception 'slot_in_past' using errcode = 'P0001';
  end if;
  new.doctor_id  := v_doctor;            -- never trust the client's doctor id
  new.status     := 'booked';
  new.created_at := now();
  new.updated_at := now();
  return new;
end
$$;

create function hs.appointments_before_update() returns trigger
language plpgsql
set search_path = pg_catalog, hs
as $$
declare
  v_doc   uuid := hs.current_doctor_id();
  v_start timestamptz;
begin
  if hs.uid() is null then
    new.updated_at := now();
    return new;                          -- server maintenance / seed context
  end if;
  if v_doc is not null and old.doctor_id = v_doc then
    if new.status not in ('booked','completed','no_show') then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
  elsif old.patient_id = hs.uid() then
    if not (old.status = 'booked' and new.status = 'cancelled') then
      raise exception 'invalid_transition' using errcode = 'P0001';
    end if;
    select s.starts_at into v_start from hs.slots s where s.id = old.slot_id;
    if v_start <= now() then
      raise exception 'too_late_to_cancel' using errcode = 'P0001';
    end if;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger appointments_before_insert before insert on hs.appointments
  for each row execute function hs.appointments_before_insert();
create trigger appointments_before_update before update on hs.appointments
  for each row execute function hs.appointments_before_update();

create function hs.visit_notes_touch() returns trigger
language plpgsql
set search_path = pg_catalog, hs
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
create trigger visit_notes_touch before update on hs.visit_notes
  for each row execute function hs.visit_notes_touch();

-- Role can never be changed by the user themself (defence in depth; the
-- column is also not granted for UPDATE).
create function hs.users_protect_role() returns trigger
language plpgsql
set search_path = pg_catalog, hs
as $$
begin
  if hs.uid() is not null and (new.role is distinct from old.role
      or new.is_demo is distinct from old.is_demo
      or new.google_sub is distinct from old.google_sub
      or new.email is distinct from old.email) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger users_protect_role before update on hs.users
  for each row execute function hs.users_protect_role();

-- ── Row Level Security ──────────────────────────────────────────────────
alter table hs.users        enable row level security;
alter table hs.sessions     enable row level security;
alter table hs.clinics      enable row level security;
alter table hs.doctors      enable row level security;
alter table hs.slots        enable row level security;
alter table hs.appointments enable row level security;
alter table hs.visit_notes  enable row level security;
alter table hs.waitlist     enable row level security;
alter table hs.rate_limits  enable row level security;

-- users: you can see and edit only yourself (name/phone only).
create policy users_select_self on hs.users for select to hs_user
  using (id = (select hs.uid()));
create policy users_update_self on hs.users for update to hs_user
  using (id = (select hs.uid())) with check (id = (select hs.uid()));
grant select (id, email, full_name, phone, role, is_demo, created_at) on hs.users to hs_user;
grant update (full_name, phone) on hs.users to hs_user;

-- sessions / waitlist / rate_limits: no policies, no grants → deny-all for app roles.

-- clinics, doctors, slots: public catalogue (doctors without user_id).
create policy clinics_public_read on hs.clinics for select to hs_anon, hs_user using (true);
grant select on hs.clinics to hs_anon, hs_user;

create policy doctors_public_read on hs.doctors for select to hs_anon, hs_user using (true);
grant select (id, clinic_id, full_name, specialty, room, contact_phone, languages, slot_minutes)
  on hs.doctors to hs_anon, hs_user;

create policy slots_public_read on hs.slots for select to hs_anon, hs_user using (true);
grant select on hs.slots to hs_anon, hs_user;

-- appointments: patients see their own; doctors see only theirs.
create policy appointments_select on hs.appointments for select to hs_user
  using (patient_id = (select hs.uid()) or doctor_id = (select hs.current_doctor_id()));
create policy appointments_insert on hs.appointments for insert to hs_user
  with check (patient_id = (select hs.uid()));
create policy appointments_update on hs.appointments for update to hs_user
  using (patient_id = (select hs.uid()) or doctor_id = (select hs.current_doctor_id()))
  with check (patient_id = (select hs.uid()) or doctor_id = (select hs.current_doctor_id()));
grant select on hs.appointments to hs_user;
grant insert (slot_id, doctor_id, patient_id, patient_name, patient_phone, symptoms, ai_specialty, ai_urgency)
  on hs.appointments to hs_user;
grant update (status) on hs.appointments to hs_user;

-- visit_notes: written by the appointment's doctor, readable by that doctor and the patient.
create policy visit_notes_select on hs.visit_notes for select to hs_user
  using (
    doctor_id = (select hs.current_doctor_id())
    or exists (select 1 from hs.appointments a
               where a.id = appointment_id and a.patient_id = (select hs.uid()))
  );
create policy visit_notes_insert on hs.visit_notes for insert to hs_user
  with check (
    doctor_id = (select hs.current_doctor_id())
    and exists (select 1 from hs.appointments a
                where a.id = appointment_id and a.doctor_id = (select hs.current_doctor_id()))
  );
create policy visit_notes_update on hs.visit_notes for update to hs_user
  using (doctor_id = (select hs.current_doctor_id()))
  with check (doctor_id = (select hs.current_doctor_id()));
grant select on hs.visit_notes to hs_user;
grant insert (appointment_id, doctor_id, recommendations) on hs.visit_notes to hs_user;
grant update (recommendations) on hs.visit_notes to hs_user;

-- ── RPCs ────────────────────────────────────────────────────────────────
-- Free future slots of one doctor. SECURITY DEFINER so it can check
-- appointments without exposing who booked them (returns no PII).
create function hs.available_slots(p_doctor_id uuid, p_from timestamptz, p_to timestamptz)
returns table (slot_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer
set search_path = pg_catalog, hs
as $$
  select s.id, s.starts_at, s.ends_at
  from hs.slots s
  where s.doctor_id = p_doctor_id
    and s.starts_at >= greatest(p_from, now() + interval '10 minutes')
    and s.starts_at <  least(p_to, now() + interval '15 days')
    and not exists (
      select 1 from hs.appointments a where a.slot_id = s.id and a.status <> 'cancelled'
    )
  order by s.starts_at
  limit 1000
$$;

-- Next free slot + number of free slots in the next 7 days, per doctor.
create function hs.doctor_availability(p_doctor_ids uuid[])
returns table (doctor_id uuid, next_slot timestamptz, free_7d int)
language sql stable security definer
set search_path = pg_catalog, hs
as $$
  select s.doctor_id, min(s.starts_at), count(*) filter (where s.starts_at < now() + interval '7 days')::int
  from hs.slots s
  where s.doctor_id = any(p_doctor_ids)
    and s.starts_at >= now() + interval '10 minutes'
    and s.starts_at <  now() + interval '15 days'
    and not exists (
      select 1 from hs.appointments a where a.slot_id = s.id and a.status <> 'cancelled'
    )
  group by s.doctor_id
$$;

-- Atomic booking. SECURITY INVOKER: runs as hs_user, so RLS + column grants
-- + triggers all apply. The partial unique index is the final arbiter.
create function hs.book_appointment(
  p_slot_id uuid, p_name text, p_phone text, p_symptoms text,
  p_specialty text, p_urgency text
) returns table (result_code text, result_id uuid)
language plpgsql
set search_path = pg_catalog, hs
as $$
declare
  v_uid    uuid := hs.uid();
  v_start  timestamptz;
  v_doctor uuid;
  v_active int;
  v_id     uuid;
begin
  if v_uid is null then
    return query select 'unauthenticated'::text, null::uuid; return;
  end if;

  select s.starts_at, s.doctor_id into v_start, v_doctor from hs.slots s where s.id = p_slot_id;
  if v_start is null then
    return query select 'not_found'::text, null::uuid; return;
  end if;
  if v_start <= now() + interval '10 minutes' then
    return query select 'too_late'::text, null::uuid; return;
  end if;

  select count(*) into v_active
  from hs.appointments a join hs.slots s on s.id = a.slot_id
  where a.patient_id = v_uid and a.status = 'booked' and s.starts_at > now();
  if v_active >= 5 then
    return query select 'limit_reached'::text, null::uuid; return;
  end if;

  begin
    insert into hs.appointments
      (slot_id, doctor_id, patient_id, patient_name, patient_phone, symptoms, ai_specialty, ai_urgency)
    values
      (p_slot_id, v_doctor, v_uid, p_name, p_phone, coalesce(p_symptoms, ''),
       nullif(p_specialty, '')::hs.specialty, nullif(p_urgency, '')::hs.urgency)
    returning id into v_id;
  exception when unique_violation then
    return query select 'slot_taken'::text, null::uuid; return;
  end;

  return query select 'ok'::text, v_id;
end
$$;

-- Generates the next p_days of slots (Mon–Sat, 09:00–17:00 Tashkent, lunch 13–14).
-- Idempotent; used by the seed script and the daily maintenance cron. Owner-only.
create function hs.generate_slots(p_days int default 14) returns int
language plpgsql
set search_path = pg_catalog, hs
as $$
declare
  n int;
begin
  insert into hs.slots (doctor_id, starts_at, ends_at)
  select d.id, ts, ts + make_interval(mins => d.slot_minutes)
  from hs.doctors d
  cross join generate_series(0, p_days - 1) as day_offset
  cross join lateral (
    select ((now() at time zone 'Asia/Tashkent')::date + day_offset) as day
  ) dd
  cross join lateral generate_series(
    (dd.day + time '09:00') at time zone 'Asia/Tashkent',
    (dd.day + time '17:00') at time zone 'Asia/Tashkent' - make_interval(mins => d.slot_minutes),
    make_interval(mins => d.slot_minutes)
  ) as ts
  where extract(isodow from dd.day) < 7
    and not ((ts at time zone 'Asia/Tashkent')::time >= time '13:00'
         and (ts at time zone 'Asia/Tashkent')::time <  time '14:00')
  on conflict (doctor_id, starts_at) do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;

-- Fixed-window rate limiter shared by all serverless instances. Owner-only.
create function hs.rate_limit_hit(p_key text, p_window_seconds int, p_max int) returns boolean
language plpgsql
set search_path = pg_catalog, hs
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count  int;
begin
  insert into hs.rate_limits(key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = hs.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end
$$;

-- ── Function privileges ─────────────────────────────────────────────────
revoke all on all functions in schema hs from public;
grant execute on function hs.uid() to hs_anon, hs_user;
grant execute on function hs.current_doctor_id() to hs_anon, hs_user;
grant execute on function hs.available_slots(uuid, timestamptz, timestamptz) to hs_anon, hs_user;
grant execute on function hs.doctor_availability(uuid[]) to hs_anon, hs_user;
grant execute on function hs.book_appointment(uuid, text, text, text, text, text) to hs_user;
-- generate_slots, rate_limit_hit: owner only (no grants).
