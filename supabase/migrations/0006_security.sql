-- Closing the holes the security review found. Apply straight after 0005_legacy.sql.
-- The rule throughout: what a person's session can do directly against the database is what they may do,
-- so anything that opens a seal or speaks for her goes through the server, where it is checked and logged.

create or replace function public.is_owner(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m
                 where m.household_id = h and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;
revoke all on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_owner(uuid) to authenticated;

-- ---------- her words: transcripts are never read directly ----------
-- The Today page reads only turns Remi has gone through, and never sealed ones, through the server.
drop policy events_sel on public.events;
create policy events_sel on public.events for select to authenticated
  using (public.is_member(household_id) and type = 'alert');
create policy events_audit_sel on public.events for select to authenticated
  using (public.is_admin(household_id) and type in ('passed_marked', 'passed_undone', 'event_marked', 'export'));

-- the evening note is written by the server; nobody edits it
drop policy digests_all on public.digests;
create policy digests_sel on public.digests for select to authenticated using (public.is_member(household_id));

-- ---------- what opens a seal goes through the server ----------
-- a date on a life event opens what waits for it, so nobody sets one directly
drop policy events_all on public.life_events;
create policy life_events_sel on public.life_events for select to authenticated using (public.is_member(household_id));

-- status opens every after-death memory: only the server may change it, and it logs who asked.
-- What the house is, where alerts go and whose clock opens dated memories: owners and admins.
create or replace function public.guard_household_columns() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if; -- the server (service role) is trusted
  if (new.status, new.passed_on, new.passed_marked_at, new.is_demo, new.extracted_through)
     is distinct from (old.status, old.passed_on, old.passed_marked_at, old.is_demo, old.extracted_through) then
    raise exception 'only the server may change this';
  end if;
  if (new.care_type, new.telegram_chat_id, new.timezone)
     is distinct from (old.care_type, old.telegram_chat_id, old.timezone)
     and not public.is_admin(old.id) then
    raise exception 'only an owner or admin may change this';
  end if;
  return new;
end $$;

-- the clip of her consent is set only by her tablet, or an admin could point it at a sealed recording
create or replace function public.guard_consent_recording() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.recording_id is not null then raise exception 'only the tablet may set this'; end if;
  elsif new.recording_id is distinct from old.recording_id then
    raise exception 'only the tablet may set this';
  end if;
  return new;
end $$;
create trigger consents_guard before insert or update on public.consents
  for each row execute function public.guard_consent_recording();

-- ---------- a letter for someone outside the family ----------
-- Opening it does not make it the family's: only the admins who hand it on may read it.
create or replace function public.can_see_memory(m public.memories) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(m.household_id)
    and (m.recipient_name is null or (select auth.uid()) = any (m.visible_to) or public.is_admin(m.household_id))
    and (
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

-- ---------- tablets ----------
-- A tablet link can hear her stories and speak as her, so only admins make them, and we know who did.
alter table public.devices add column created_by uuid references auth.users on delete set null;
drop policy devices_ins on public.devices;
create policy devices_ins on public.devices for insert to authenticated
  with check (public.is_admin(household_id) and created_by = (select auth.uid()));
drop policy devices_upd on public.devices;
create policy devices_upd on public.devices for update to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
drop policy devices_sel on public.devices;
create policy devices_sel on public.devices for select to authenticated using (public.is_admin(household_id));

-- ---------- invites ----------
-- only the owner may raise someone to admin, directly or through the app
drop policy invites_admin on public.invites;
create policy invites_admin on public.invites for all to authenticated
  using (public.is_admin(household_id))
  with check (public.is_admin(household_id) and (role = 'family' or public.is_owner(household_id)));

-- ---------- photos ----------
-- members may look and add; only admins may remove; nobody overwrites; the shared demo is read-only
drop policy family_media_rw on storage.objects;
create policy family_media_sel on storage.objects for select to authenticated
  using (bucket_id = 'family-media' and (storage.foldername(name))[1] in
         (select household_id::text from public.household_members where user_id = (select auth.uid())));
create policy family_media_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'family-media' and (storage.foldername(name))[1] in
         (select m.household_id::text from public.household_members m join public.households h on h.id = m.household_id
          where m.user_id = (select auth.uid()) and not h.is_demo));
create policy family_media_del on storage.objects for delete to authenticated
  using (bucket_id = 'family-media' and (storage.foldername(name))[1] in
         (select m.household_id::text from public.household_members m join public.households h on h.id = m.household_id
          where m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and not h.is_demo));

update storage.buckets set file_size_limit = 8000000, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  where id = 'family-media';
update storage.buckets set file_size_limit = 2000000, allowed_mime_types = array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
  where id = 'voice';

-- ---------- the public demo ----------
-- Anyone can sign in to the demo, as its owner, so its session must not be able to change it.
-- Questions and marking a memory true or unsure stay open: they are the demo.
create or replace function public.guard_demo_household() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row_json jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  hid uuid := coalesce(row_json ->> 'household_id', row_json ->> 'id')::uuid;
begin
  if (select auth.uid()) is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if exists (select 1 from public.households h where h.id = hid and h.is_demo) then
    raise exception 'the demo family cannot be changed';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger demo_guard before update on public.households for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.invites for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.devices for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.people for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.face_embeddings for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.routine_items for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.sensitive_guidance for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.care_contacts for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.consents for each row execute function public.guard_demo_household();
create trigger demo_guard before insert or update or delete on public.photos for each row execute function public.guard_demo_household();

-- what the app caps, the database caps too: this text goes to the model and onto her tablet
alter table public.family_questions add constraint family_questions_length check (char_length(question) <= 300);
