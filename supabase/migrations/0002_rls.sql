create or replace function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.household_members m
                 where m.household_id = h and m.user_id = (select auth.uid()));
$$;
revoke all on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.devices enable row level security;
alter table public.people enable row level security;
alter table public.face_embeddings enable row level security;
alter table public.routine_items enable row level security;
alter table public.sensitive_guidance enable row level security;
alter table public.events enable row level security;
alter table public.digests enable row level security;

create policy households_sel on public.households for select to authenticated using (public.is_member(id));
create policy households_upd on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
create policy members_own on public.household_members for select to authenticated using (user_id = (select auth.uid()));

create policy devices_sel on public.devices for select to authenticated using (public.is_member(household_id));
create policy devices_ins on public.devices for insert to authenticated with check (public.is_member(household_id));
create policy devices_upd on public.devices for update to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy people_all on public.people for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy faces_all on public.face_embeddings for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy routine_all on public.routine_items for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy guidance_all on public.sensitive_guidance for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy events_sel on public.events for select to authenticated using (public.is_member(household_id));
create policy digests_all on public.digests for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

insert into storage.buckets (id, name, public) values ('family-media', 'family-media', false)
  on conflict (id) do nothing;

create policy family_media_rw on storage.objects for all to authenticated
  using (bucket_id = 'family-media' and (storage.foldername(name))[1] in
         (select household_id::text from public.household_members where user_id = (select auth.uid())))
  with check (bucket_id = 'family-media' and (storage.foldername(name))[1] in
         (select household_id::text from public.household_members where user_id = (select auth.uid())));
