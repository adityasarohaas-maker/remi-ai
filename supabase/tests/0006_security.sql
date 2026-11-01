-- Tries each attack from the security review as a real signed-in user, and what must keep working.
-- Run after 0005_legacy.sql and 0006_security.sql. One transaction, rolled back: it leaves nothing behind.
begin;
select set_config('request.jwt.claims', '', true);

create function pg_temp.as_user(who uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

-- the statement must raise, or touch no rows
create function pg_temp.denied(who uuid, stmt text, label text) returns void language plpgsql as $$
declare n int;
begin
  begin
    perform pg_temp.as_user(who);
    execute stmt;
    get diagnostics n = row_count;
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
  exception when others then
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    raise notice 'denied: %', label;
    return;
  end;
  if n > 0 then raise exception 'NOT DENIED (% rows): %', n, label; end if;
  raise notice 'denied: %', label;
end $$;

-- the statement must touch at least one row; its work is undone
create function pg_temp.allowed(who uuid, stmt text, label text) returns void language plpgsql as $$
declare n int;
begin
  begin
    perform pg_temp.as_user(who);
    execute stmt;
    get diagnostics n = row_count;
    raise exception 'undo %', n;
  exception when others then
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    if sqlerrm not like 'undo %' then raise exception 'WRONGLY DENIED: % (%)', label, sqlerrm; end if;
    if split_part(sqlerrm, ' ', 2)::int = 0 then raise exception 'WRONGLY DENIED (no rows): %', label; end if;
    raise notice 'allowed: %', label;
  end;
end $$;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner.t@example.com', '', now(), now(), now()),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.t@example.com', '', now(), now(), now()),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'family.t@example.com', '', now(), now(), now()),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo.t@example.com', '', now(), now(), now());

insert into public.households (id, patient_name, preferred_name, status, timezone, is_demo) values
  ('00000000-0000-4000-8000-0000000000f1', 'Test Devi', 'Test', 'living', 'Asia/Kolkata', false),
  ('00000000-0000-4000-8000-0000000000f2', 'Demo Devi', 'Demo', 'living', 'Asia/Kolkata', true);
insert into public.household_members (household_id, user_id, role) values
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'owner'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a2', 'admin'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a3', 'family'),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a4', 'owner');
insert into public.life_events (id, household_id, name) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000f1', 'Wedding');
insert into public.memories (id, household_id, title, summary, quote, visibility, visible_to, open_event_id, recipient_name, opened_at) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-0000000000f1', 'after death', 's', 'q', 'after_death', '{}', null, null, null),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000f1', 'on event', 's', 'q', 'on_event', '{}', '00000000-0000-4000-8000-0000000000e1', null, null),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000f1', 'to an outsider', 's', 'q', 'on_date', '{}', null, 'Sunita', now());
update public.memories set open_on = '2020-01-01' where id = '00000000-0000-4000-8000-0000000000d3';
insert into public.events (household_id, type, payload) values
  ('00000000-0000-4000-8000-0000000000f1', 'conversation', '{"text":"only for Priya"}'),
  ('00000000-0000-4000-8000-0000000000f1', 'persona', '{"text":"hi"}'),
  ('00000000-0000-4000-8000-0000000000f1', 'alert', '{"reason":"help_button"}');
insert into public.digests (household_id, day, facts, summary, model) values
  ('00000000-0000-4000-8000-0000000000f1', current_date, '{}', 'note', 'm');
insert into storage.objects (bucket_id, name) values
  ('family-media', '00000000-0000-4000-8000-0000000000f1/photos/a.jpg'),
  ('family-media', '00000000-0000-4000-8000-0000000000f2/photos/b.jpg');
insert into public.family_questions (household_id, asked_by, question) values
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-0000000000a4', 'seed');

do $$
declare
  owner_id uuid := '00000000-0000-4000-8000-0000000000a1';
  admin_id uuid := '00000000-0000-4000-8000-0000000000a2';
  fam uuid := '00000000-0000-4000-8000-0000000000a3';
  demo uuid := '00000000-0000-4000-8000-0000000000a4';
  h text := '''00000000-0000-4000-8000-0000000000f1''';
  d text := '''00000000-0000-4000-8000-0000000000f2''';
begin
  -- transcripts
  perform pg_temp.denied(fam, 'select 1 from public.events where type = ''conversation''', 'a member reads raw turns');
  perform pg_temp.denied(owner_id, 'select 1 from public.events where type = ''conversation''', 'an owner reads raw turns');
  perform pg_temp.denied(fam, 'select 1 from public.events where type = ''persona''', 'a member reads another''s persona chat');
  perform pg_temp.allowed(fam, 'select 1 from public.events where type = ''alert''', 'a member reads safety alerts');
  perform pg_temp.denied(fam, 'update public.digests set summary = ''forged''', 'a member rewrites the evening note');
  perform pg_temp.allowed(fam, 'select 1 from public.digests', 'a member reads the evening note');

  -- opening seals
  perform pg_temp.denied(fam, 'update public.life_events set happened_on = current_date', 'a member opens on_event memories');
  perform pg_temp.denied(admin_id, 'update public.life_events set happened_on = current_date', 'an admin silently opens on_event memories');
  perform pg_temp.allowed(fam, 'select 1 from public.life_events', 'a member sees the events');
  perform pg_temp.denied(owner_id, format('update public.households set status = ''passed'' where id = %s', h), 'an owner silently marks her passed');
  perform pg_temp.denied(admin_id, format('update public.households set status = ''passed'' where id = %s', h), 'an admin silently marks her passed');
  perform pg_temp.denied(admin_id, format('update public.households set is_demo = true where id = %s', h), 'an admin changes is_demo');

  -- the consent clip
  perform pg_temp.denied(owner_id, format('insert into public.consents (household_id, recording_id) values (%s, gen_random_uuid())', h), 'an owner points consent at a clip');
  perform pg_temp.allowed(owner_id, format('insert into public.consents (household_id, record_voice) values (%s, true)', h), 'an owner saves consent');

  -- alerts and the clock
  perform pg_temp.denied(fam, format('update public.households set telegram_chat_id = ''666'' where id = %s', h), 'a member diverts alerts');
  perform pg_temp.denied(fam, format('update public.households set timezone = ''Pacific/Kiritimati'' where id = %s', h), 'a member moves the clock');
  perform pg_temp.allowed(admin_id, format('update public.households set telegram_chat_id = ''1'' where id = %s', h), 'an admin sets alerts');
  perform pg_temp.allowed(fam, format('update public.households set about = ''loves roses'' where id = %s', h), 'a member edits about');

  -- tablets
  perform pg_temp.denied(fam, format('insert into public.devices (household_id, token_hash, label, created_by) values (%s, ''x1'', ''t'', %L)', h, fam), 'a member makes a tablet link');
  perform pg_temp.denied(admin_id, format('insert into public.devices (household_id, token_hash, label, created_by) values (%s, ''x2'', ''t'', %L)', h, owner_id), 'an admin makes a link in another''s name');
  perform pg_temp.allowed(admin_id, format('insert into public.devices (household_id, token_hash, label, created_by) values (%s, ''x3'', ''t'', %L)', h, admin_id), 'an admin makes a tablet link');

  -- invites
  perform pg_temp.denied(admin_id, format('insert into public.invites (household_id, email, display_name, role, token_hash, expires_at) values (%s, ''e@x'', ''n'', ''admin'', ''y1'', now())', h), 'an admin invites an admin');
  perform pg_temp.allowed(owner_id, format('insert into public.invites (household_id, email, display_name, role, token_hash, expires_at) values (%s, ''e@x'', ''n'', ''admin'', ''y2'', now())', h), 'the owner invites an admin');

  -- photos
  perform pg_temp.denied(fam, 'delete from storage.objects where name like ''%/a.jpg''', 'a member deletes a photo');
  perform pg_temp.denied(fam, 'update storage.objects set name = ''x'' where name like ''%/a.jpg''', 'a member overwrites a photo');
  perform pg_temp.allowed(admin_id, 'delete from storage.objects where name like ''%/a.jpg''', 'an admin deletes a photo');
  perform pg_temp.allowed(fam, 'select 1 from storage.objects where name like ''%/a.jpg''', 'a member sees a photo');
  perform pg_temp.allowed(fam, format('insert into storage.objects (bucket_id, name) values (''family-media'', %s || ''/photos/c.jpg'')', h), 'a member adds a photo');

  -- the demo
  perform pg_temp.denied(demo, format('update public.households set telegram_chat_id = ''666'' where id = %s', d), 'the demo redirects alerts');
  perform pg_temp.denied(demo, format('update public.households set about = ''spam'' where id = %s', d), 'the demo defaces the profile');
  perform pg_temp.denied(demo, format('insert into public.invites (household_id, email, display_name, role, token_hash, expires_at) values (%s, ''v@x'', ''n'', ''family'', ''y3'', now())', d), 'the demo sends invites');
  perform pg_temp.denied(demo, format('insert into public.devices (household_id, token_hash, label, created_by) values (%s, ''x4'', ''t'', %L)', d, demo), 'the demo makes tablet links');
  perform pg_temp.denied(demo, format('insert into public.people (household_id, name, relation) values (%s, ''n'', ''r'')', d), 'the demo edits people');
  perform pg_temp.denied(demo, format('insert into storage.objects (bucket_id, name) values (''family-media'', %s || ''/photos/x.jpg'')', d), 'the demo uploads a file');
  perform pg_temp.denied(demo, 'delete from storage.objects where name like ''%/b.jpg''', 'the demo deletes a file');
  perform pg_temp.allowed(demo, format('insert into public.family_questions (household_id, asked_by, question) values (%s, %L, ''what was school like?'')', d, demo), 'the demo asks a question');
  perform pg_temp.denied(demo, format('insert into public.family_questions (household_id, asked_by, question) values (%s, %L, repeat(''x'', 301))', d, demo), 'an endless question');
  perform pg_temp.denied(demo, format('select 1 from public.households where id = %s', h), 'the demo reaches a real family');

  -- a letter to someone outside the family, once open
  perform pg_temp.denied(fam, 'select 1 from public.memories where title = ''to an outsider''', 'a member reads a letter to an outsider');
  perform pg_temp.allowed(admin_id, 'select 1 from public.memories where title = ''to an outsider''', 'an admin reads it to hand it on');

  -- the server still can (no signed-in user)
  update public.households set status = 'passed', passed_on = current_date where id = '00000000-0000-4000-8000-0000000000f1';
  update public.life_events set happened_on = current_date;
  perform pg_temp.allowed(fam, 'select 1 from public.memories where title = ''after death''', 'after the server marks her passed, a member reads after-death');
  perform pg_temp.allowed(fam, 'select 1 from public.memories where title = ''on event''', 'after the server marks the day, a member reads on-event');
  update public.households set about = 'seed' where id = '00000000-0000-4000-8000-0000000000f2';
  raise notice 'ALL SECURITY CHECKS PASSED';
end $$;

rollback;
