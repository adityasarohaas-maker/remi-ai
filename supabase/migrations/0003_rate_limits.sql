-- Atomic fixed-window rate limiting (final review I2): reserve the slot BEFORE the model call,
-- so parallel requests cannot all read "0 so far" and all go through.
create table public.rate_limits (
  household_id uuid not null references public.households on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  n integer not null default 0,
  primary key (household_id, bucket, window_start)
);
alter table public.rate_limits enable row level security;
-- no policies: only the service role (server code) touches this table

create or replace function public.take_rate_token(p_household uuid, p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  used integer;
begin
  insert into public.rate_limits (household_id, bucket, window_start, n)
    values (p_household, p_bucket, w, 1)
  on conflict (household_id, bucket, window_start) do update set n = public.rate_limits.n + 1
  returning n into used;
  -- keep the table small
  delete from public.rate_limits where household_id = p_household and window_start < now() - interval '1 day';
  return used <= p_limit;
end $$;
revoke all on function public.take_rate_token(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.take_rate_token(uuid, text, integer, integer) to service_role;
