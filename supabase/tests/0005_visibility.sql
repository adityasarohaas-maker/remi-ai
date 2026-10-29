-- Proves can_see_memory as two family members would see it. Rolls back: run on a copy or in a transaction.
-- Run AFTER 0005_legacy.sql is applied (the whole file is one transaction and rolls back).
begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya.test@example.com', '', now(), now(), now()),
       ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'arjun.test@example.com', '', now(), now(), now()),
       ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger.test@example.com', '', now(), now(), now());

insert into public.households (id, patient_name, preferred_name, status, timezone)
values ('00000000-0000-4000-8000-0000000000f1', 'Test Devi', 'Test', 'living', 'Asia/Kolkata');
insert into public.household_members (household_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'owner'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a2', 'family');
insert into public.life_events (id, household_id, name, happened_on)
values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000f1', 'Wedding', null);

insert into public.memories (id, household_id, title, summary, quote, visibility, visible_to, open_on, open_event_id) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000f1', 'everyone', 's', 'q', 'everyone', '{}', null, null),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000f1', 'priya only', 's', 'q', 'members', '{00000000-0000-4000-8000-0000000000a1}', null, null),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000f1', 'after death', 's', 'q', 'after_death', '{}', null, null),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-0000000000f1', 'date past', 's', 'q', 'on_date', '{}', '2020-01-01', null),
  ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-0000000000f1', 'date future', 's', 'q', 'on_date', '{}', '2099-01-01', null),
  ('00000000-0000-4000-8000-0000000000d6', '00000000-0000-4000-8000-0000000000f1', 'on event', 's', 'q', 'on_event', '{}', null, '00000000-0000-4000-8000-0000000000e1'),
  ('00000000-0000-4000-8000-0000000000d7', '00000000-0000-4000-8000-0000000000f1', 'remi only', 's', 'q', 'remi_only', '{}', null, null);

create temp table seen (who text, n int);
grant insert on seen to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
insert into seen select 'priya living', count(*) from public.memories;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
insert into seen select 'arjun living', count(*) from public.memories;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a3","role":"authenticated"}', true);
insert into seen select 'stranger', count(*) from public.memories;
-- a family member may not mark her passed
do $$
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
  begin
    update public.households set status = 'passed' where id = '00000000-0000-4000-8000-0000000000f1';
    raise exception 'family member changed status';
  exception when others then
    if sqlerrm = 'family member changed status' then raise; end if;
    raise notice 'family member blocked: %', sqlerrm;
  end;
  reset role;
end $$;
reset role;

update public.households set status = 'passed' where id = '00000000-0000-4000-8000-0000000000f1';
update public.life_events set happened_on = current_date where id = '00000000-0000-4000-8000-0000000000e1';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2","role":"authenticated"}', true);
insert into seen select 'arjun passed+event', count(*) from public.memories;
reset role;

do $$
declare r record;
begin
  for r in select * from seen loop raise notice '% -> %', r.who, r.n; end loop;
  -- living: priya sees everyone + priya-only + date-past = 3; arjun sees everyone + date-past = 2; stranger 0
  assert (select n from seen where who = 'priya living') = 3, 'priya living';
  assert (select n from seen where who = 'arjun living') = 2, 'arjun living';
  assert (select n from seen where who = 'stranger') = 0, 'stranger';
  -- passed + event happened: arjun adds after-death and on-event = 4 (never priya-only, never remi-only, never future date)
  assert (select n from seen where who = 'arjun passed+event') = 4, 'arjun passed+event';
  raise notice 'visibility OK';
end $$;

rollback;
