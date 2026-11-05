begin;
create table if not exists public.cabinet_appointments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 1 and 40),
  email text not null check (char_length(email) <= 254),
  service text not null,
  preferred_date date,
  message text check (char_length(message) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists cabinet_appointments_created_idx
  on public.cabinet_appointments(created_at desc);
alter table public.cabinet_appointments enable row level security;
revoke all on public.cabinet_appointments from public, anon, authenticated;
grant select, insert, delete on public.cabinet_appointments to service_role;
comment on table public.cabinet_appointments is
  'Private appointment requests. Access only through the administrator-checked Edge Function; manual retention/deletion by the cabinet.';
commit;
