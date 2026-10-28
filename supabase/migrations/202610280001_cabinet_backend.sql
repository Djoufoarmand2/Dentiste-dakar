-- Cabinet-only resources. No destructive changes to pre-existing data.
begin;

create table if not exists public.cabinet_config (
  id boolean primary key default true check (id),
  admin_email text not null,
  media_base_url text not null
);
create table if not exists public.cabinet_admins (
  id boolean primary key default true check (id),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.cabinet_site_content (
  id boolean primary key default true check (id),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.cabinet_media (
  path text primary key check (path ~ '^uploads/[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm)$'),
  public_url text not null unique,
  name text not null check (length(name) between 1 and 200),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm')),
  size bigint not null check (size > 0 and size <= 52428800),
  status text not null default 'uploading' check (status in ('uploading','ready','deleting')),
  created_at timestamptz not null default now()
);

alter table public.cabinet_config enable row level security;
alter table public.cabinet_admins enable row level security;
alter table public.cabinet_site_content enable row level security;
alter table public.cabinet_media enable row level security;
revoke all on public.cabinet_config, public.cabinet_admins, public.cabinet_site_content, public.cabinet_media from public, anon, authenticated;
grant all on public.cabinet_config, public.cabinet_admins, public.cabinet_site_content, public.cabinet_media to service_role;
grant select on public.cabinet_admins, public.cabinet_site_content, public.cabinet_media to authenticated;

create or replace function public.cabinet_is_admin_for(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cabinet_admins a
    join auth.users u on u.id = a.user_id
    join public.cabinet_config c on c.id = a.id
    where a.user_id = p_user_id and u.email_confirmed_at is not null
      and lower(trim(u.email)) = c.admin_email
  );
$$;
revoke all on function public.cabinet_is_admin_for(uuid) from public, anon, authenticated;
grant execute on function public.cabinet_is_admin_for(uuid) to service_role;

create or replace function public.cabinet_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.cabinet_is_admin_for((select auth.uid()));
$$;
revoke all on function public.cabinet_is_admin() from public, anon;
grant execute on function public.cabinet_is_admin() to authenticated, service_role;

drop policy if exists cabinet_admin_self_read on public.cabinet_admins;
create policy cabinet_admin_self_read on public.cabinet_admins for select to authenticated
  using (user_id = (select auth.uid()) and (select public.cabinet_is_admin()));
drop policy if exists cabinet_content_admin_read on public.cabinet_site_content;
create policy cabinet_content_admin_read on public.cabinet_site_content for select to authenticated
  using ((select public.cabinet_is_admin()));
drop policy if exists cabinet_media_admin_read on public.cabinet_media;
create policy cabinet_media_admin_read on public.cabinet_media for select to authenticated
  using ((select public.cabinet_is_admin()));

create or replace function public.cabinet_claim_admin(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from auth.users u cross join public.cabinet_config c
    where u.id = p_user_id and u.email_confirmed_at is not null
      and lower(trim(u.email)) = c.admin_email
  ) then return false; end if;
  insert into public.cabinet_admins(id,user_id) values (true,p_user_id) on conflict (id) do nothing;
  return public.cabinet_is_admin_for(p_user_id);
end;
$$;
revoke all on function public.cabinet_claim_admin(uuid) from public, anon, authenticated;
grant execute on function public.cabinet_claim_admin(uuid) to service_role;

create or replace function public.cabinet_publish(p_actor uuid, p_expected_version integer, p_content jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  current_version integer;
  base_url text;
begin
  if not public.cabinet_is_admin_for(p_actor) then raise exception 'admin_required'; end if;
  perform pg_advisory_xact_lock(hashtext('cabinet-publication-media'));
  select version into current_version from public.cabinet_site_content where id for update;
  if current_version is null then raise exception 'content_missing'; end if;
  if current_version <> p_expected_version then raise exception 'version_conflict'; end if;
  select media_base_url into base_url from public.cabinet_config where id;
  if exists (
    select 1 from jsonb_path_query(p_content, '$.** ? (@.type() == "string")') as s(value)
    where s.value #>> '{}' like base_url || '/%'
      and not exists (select 1 from public.cabinet_media m where m.public_url = s.value #>> '{}' and m.status = 'ready')
  ) then raise exception 'media_not_ready'; end if;
  update public.cabinet_site_content set content=p_content,version=version+1,updated_at=now() where id;
  return jsonb_build_object('content',p_content,'version',current_version+1);
end;
$$;
revoke all on function public.cabinet_publish(uuid,integer,jsonb) from public, anon, authenticated;
grant execute on function public.cabinet_publish(uuid,integer,jsonb) to service_role;

create or replace function public.cabinet_begin_delete_media(p_actor uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare media_url text;
begin
  if not public.cabinet_is_admin_for(p_actor) then raise exception 'admin_required'; end if;
  perform pg_advisory_xact_lock(hashtext('cabinet-publication-media'));
  select public_url into media_url from public.cabinet_media where path=p_path for update;
  if media_url is null then return; end if;
  if exists (
    select 1 from public.cabinet_site_content c,
      lateral jsonb_path_query(c.content, '$.** ? (@.type() == "string")') as s(value)
    where s.value #>> '{}' = media_url
  ) then raise exception 'media_referenced'; end if;
  update public.cabinet_media set status='deleting' where path=p_path;
end;
$$;
revoke all on function public.cabinet_begin_delete_media(uuid,text) from public, anon, authenticated;
grant execute on function public.cabinet_begin_delete_media(uuid,text) to service_role;

-- Bytes travel directly to Storage. Neither a client role nor user_metadata
-- can confer cabinet administration. Delete is reserved to the guarded function.
drop policy if exists cabinet_media_insert on storage.objects;
create policy cabinet_media_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cabinet-media' and (select public.cabinet_is_admin())
    and exists (select 1 from public.cabinet_media m where m.path=storage.objects.name and m.status='uploading')
  );
drop policy if exists cabinet_media_storage_read on storage.objects;
create policy cabinet_media_storage_read on storage.objects for select to authenticated
  using (bucket_id='cabinet-media' and (select public.cabinet_is_admin()));

commit;
