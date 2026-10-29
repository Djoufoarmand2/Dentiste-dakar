begin;

-- Store only keyed IP digests, never the original addresses. Stale attempts
-- are removed on each check, and at most three recent rows exist per visitor.
create table if not exists public.cabinet_review_rate_limit_events (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz not null
);

create index if not exists cabinet_review_rate_limit_events_ip_time_idx
  on public.cabinet_review_rate_limit_events (ip_hash, attempted_at desc);
create index if not exists cabinet_review_rate_limit_events_time_idx
  on public.cabinet_review_rate_limit_events (attempted_at);

alter table public.cabinet_review_rate_limit_events enable row level security;
revoke all on public.cabinet_review_rate_limit_events from public, anon, authenticated, service_role;

create or replace function public.cabinet_allow_review_submission(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  check_time timestamptz;
  recent_count integer;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_review_rate_limit_key';
  end if;

  -- Serialize submissions from the same visitor across Edge Function instances.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 0));
  check_time := clock_timestamp();

  -- Also remove expired digests globally so records do not accumulate between visits.
  delete from public.cabinet_review_rate_limit_events
  where attempted_at <= check_time - interval '10 minutes';

  select count(*)::integer
    into recent_count
    from public.cabinet_review_rate_limit_events
   where ip_hash = p_ip_hash
     and attempted_at > check_time - interval '10 minutes';

  if recent_count >= 3 then
    return false;
  end if;

  insert into public.cabinet_review_rate_limit_events (ip_hash, attempted_at)
  values (p_ip_hash, check_time);
  return true;
end;
$$;

revoke all on function public.cabinet_allow_review_submission(text) from public, anon, authenticated;
grant execute on function public.cabinet_allow_review_submission(text) to service_role;

commit;
