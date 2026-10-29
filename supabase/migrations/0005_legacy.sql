-- Keeping a life: memories in her own voice, who may hear them and when, family roles, consent.
-- The visibility rule here mirrors src/core/visibility.ts (memoryOpen); keep the two in step.

-- households: who she is to Remi, and whether she is still with us
alter table public.households
  add column care_type text not null default 'elderly' check (care_type in ('elderly','dementia','terminal')),
  add column status text not null default 'living' check (status in ('living','passed')),
  add column passed_on date,
  add column passed_marked_at timestamptz,
  add column is_demo boolean not null default false,
  add column extracted_through bigint not null default 0;

-- family members get names, and a role that means something
alter table public.household_members
  add column display_name text,
  add column email text,
  add constraint household_members_role_check check (role in ('owner','admin','family'));

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'family' check (role in ('admin','family')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.invites (household_id);

-- her voice, one clip per turn
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  event_id bigint references public.events on delete set null,
  storage_path text not null,
  mime text not null,
  duration_ms integer,
  transcript text,
  language text,
  created_at timestamptz not null default now()
);
create index on public.recordings (household_id, created_at desc);

-- things that happen later: "Riya's wedding"
create table public.life_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  happened_on date,
  created_at timestamptz not null default now()
);
create index on public.life_events (household_id);

create table public.family_questions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  asked_by uuid references auth.users on delete set null,
  question text not null,
  status text not null default 'pending' check (status in ('pending','asked','answered')),
  asked_at timestamptz,
  answered_memory_id uuid,
  created_at timestamptz not null default now()
);
create index on public.family_questions (household_id, status);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  storage_path text not null,
  note text,
  year integer,
  uploaded_by uuid references auth.users on delete set null,
  shown_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.photos (household_id, shown_at);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  title text not null,
  summary text not null,
  quote text not null,
  language text not null default 'en',
  translation text,
  recording_id uuid references public.recordings on delete set null,
  clip_start_ms integer,
  clip_end_ms integer,
  life_stage text not null default 'other' check (life_stage in ('childhood','youth','marriage','work','parenthood','later','wishes','other')),
  year_from integer,
  year_to integer,
  people text[] not null default '{}',
  places text[] not null default '{}',
  kind text not null default 'story' check (kind in ('story','lesson','recipe','wish','letter')),
  confidence text not null default 'sure' check (confidence in ('sure','unsure')),
  verified_by uuid references auth.users on delete set null,
  visibility text not null default 'everyone' check (visibility in ('everyone','members','after_death','on_date','on_event','remi_only')),
  visible_to uuid[] not null default '{}',
  recipient_name text,
  recipient_email text,
  open_on date,
  open_event_id uuid references public.life_events on delete set null,
  opened_at timestamptz,
  question_id uuid references public.family_questions on delete set null,
  photo_id uuid references public.photos on delete set null,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(quote,'') || ' ' || coalesce(translation,''))
  ) stored,
  created_at timestamptz not null default now()
);
create index on public.memories (household_id, created_at desc);
create index on public.memories using gin (search);
alter table public.family_questions
  add constraint family_questions_answer_fk foreign key (answered_memory_id) references public.memories on delete set null;

create table public.care_signals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  kind text not null check (kind in ('pain','breath','distress','fear','confusion','appetite')),
  detail text not null,
  created_at timestamptz not null default now()
);
create index on public.care_signals (household_id, created_at desc);

create table public.care_contacts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  email text not null
);
create index on public.care_contacts (household_id);

create table public.consents (
  household_id uuid primary key references public.households on delete cascade,
  record_voice boolean not null default true,
  default_visibility text not null default 'everyone' check (default_visibility in ('everyone','after_death')),
  allow_persona boolean not null default false,
  allow_voice_clone boolean not null default false,
  decided_by text check (decided_by in ('person','family')),
  decided_by_name text,
  recording_id uuid references public.recordings on delete set null,
  decided_at timestamptz
);

-- a sealed letter can reach someone with no account
create table public.letter_links (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.letter_links (memory_id);

-- ---------- who may see a memory ----------
create or replace function public.can_see_memory(m public.memories) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(m.household_id) and (
    m.visibility = 'everyone'
    or (m.visibility = 'members' and (select auth.uid()) = any (m.visible_to))
    or (m.visibility = 'after_death'
        and exists (select 1 from public.households h where h.id = m.household_id and h.status = 'passed')
        and (cardinality(m.visible_to) = 0 or (select auth.uid()) = any (m.visible_to)))
    or (m.visibility = 'on_date'
        and m.open_on is not null
        and (select (now() at time zone h.timezone)::date from public.households h where h.id = m.household_id) >= m.open_on
        and (cardinality(m.visible_to) = 0 or (select auth.uid()) = any (m.visible_to)))
    or (m.visibility = 'on_event'
        and exists (select 1 from public.life_events e where e.id = m.open_event_id and e.happened_on is not null)
        and (cardinality(m.visible_to) = 0 or (select auth.uid()) = any (m.visible_to)))
  );
$$;
revoke all on function public.can_see_memory(public.memories) from public, anon;
grant execute on function public.can_see_memory(public.memories) to authenticated;

create or replace function public.is_admin(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m
                 where m.household_id = h and m.user_id = (select auth.uid()) and m.role in ('owner','admin'));
$$;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;

-- family marks a memory true or unsure; nothing else about a memory is theirs to change
create or replace function public.verify_memory(p_memory uuid, p_confidence text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_confidence not in ('sure','unsure') then raise exception 'bad confidence'; end if;
  update public.memories m set confidence = p_confidence, verified_by = (select auth.uid())
    where m.id = p_memory and public.can_see_memory(m);
  if not found then raise exception 'no such memory'; end if;
end $$;
revoke all on function public.verify_memory(uuid, text) from public, anon;
grant execute on function public.verify_memory(uuid, text) to authenticated;

-- how many memories are sealed, and by what rule: counts only, never the content
create or replace function public.count_sealed(p_household uuid)
returns table (visibility text, n bigint)
language sql stable security definer set search_path = '' as $$
  select m.visibility, count(*) from public.memories m
  where m.household_id = p_household and public.is_member(p_household)
    and m.visibility <> 'remi_only' and not public.can_see_memory(m)
  group by m.visibility;
$$;
revoke all on function public.count_sealed(uuid) from public, anon;
grant execute on function public.count_sealed(uuid) to authenticated;

-- ---------- row level security ----------
alter table public.invites enable row level security;
alter table public.recordings enable row level security;
alter table public.life_events enable row level security;
alter table public.family_questions enable row level security;
alter table public.photos enable row level security;
alter table public.memories enable row level security;
alter table public.care_signals enable row level security;
alter table public.care_contacts enable row level security;
alter table public.consents enable row level security;
alter table public.letter_links enable row level security;

create policy invites_admin on public.invites for all to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
-- recordings: only through a memory (signed URLs are issued server-side); no direct family access
create policy events_all on public.life_events for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy questions_sel on public.family_questions for select to authenticated using (public.is_member(household_id));
create policy questions_ins on public.family_questions for insert to authenticated
  with check (public.is_member(household_id) and asked_by = (select auth.uid()));
create policy questions_del on public.family_questions for delete to authenticated
  using (asked_by = (select auth.uid()) and status = 'pending');
create policy photos_sel on public.photos for select to authenticated using (public.is_member(household_id));
create policy photos_ins on public.photos for insert to authenticated
  with check (public.is_member(household_id) and uploaded_by = (select auth.uid()));
create policy photos_del on public.photos for delete to authenticated using (public.is_admin(household_id));
create policy memories_sel on public.memories for select to authenticated using (public.can_see_memory(memories));
create policy signals_sel on public.care_signals for select to authenticated using (public.is_member(household_id));
create policy contacts_all on public.care_contacts for all to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
create policy consents_sel on public.consents for select to authenticated using (public.is_member(household_id));
create policy consents_admin on public.consents for all to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
-- letter_links: service role only (the public letter page looks the token up server-side)

-- members may see each other's names
drop policy members_own on public.household_members;
create policy members_sel on public.household_members for select to authenticated using (public.is_member(household_id));

-- her voice lives in a private bucket that only the server touches
insert into storage.buckets (id, name, public) values ('voice', 'voice', false) on conflict (id) do nothing;
