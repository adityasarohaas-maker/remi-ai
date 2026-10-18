create table public.households (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  preferred_name text not null,
  language text not null default 'en-IN',
  timezone text not null default 'Asia/Kolkata',
  about text,
  home_address text,
  primary_contact_name text,
  primary_contact_phone text,
  telegram_chat_id text,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'family',
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  token_hash text not null unique,
  label text not null default 'Tablet',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index on public.devices (household_id);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  relation text not null,
  notes text,
  is_deceased boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.people (household_id);

create table public.face_embeddings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  embedding float8[] not null,
  photo_path text not null,
  created_at timestamptz not null default now()
);
create index on public.face_embeddings (household_id);
create index on public.face_embeddings (person_id);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  time_of_day time not null,
  kind text not null check (kind in ('medicine','meal','activity')),
  label text not null,
  spoken_message text,
  active boolean not null default true
);
create index on public.routine_items (household_id);

create table public.sensitive_guidance (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  topic text not null,
  trigger_words text[] not null,
  approach text not null check (approach in ('redirect','share_memory','call_relative')),
  family_script text not null,
  call_person_id uuid references public.people on delete set null
);
create index on public.sensitive_guidance (household_id);
create index on public.sensitive_guidance (call_person_id);

create table public.events (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.events (household_id, created_at desc);
create index on public.events (household_id, type, created_at desc);

create table public.digests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  day date not null,
  facts jsonb not null,
  summary text not null,
  model text not null,
  created_at timestamptz not null default now(),
  unique (household_id, day)
);

create or replace function public.create_household(
  p_patient_name text, p_preferred_name text, p_language text, p_timezone text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already in a household';
  end if;
  insert into public.households (patient_name, preferred_name, language, timezone)
    values (p_patient_name, p_preferred_name, p_language, p_timezone) returning id into h;
  insert into public.household_members (household_id, user_id, role) values (h, uid, 'owner');
  return h;
end $$;
revoke all on function public.create_household(text,text,text,text) from public, anon;
grant execute on function public.create_household(text,text,text,text) to authenticated;
