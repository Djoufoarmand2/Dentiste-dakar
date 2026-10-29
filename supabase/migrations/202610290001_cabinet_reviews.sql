begin;

create table if not exists public.cabinet_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  service text not null default '' check (length(service) <= 120),
  quote text not null check (length(quote) between 1 and 1500),
  rating smallint not null check (rating between 1 and 5),
  source text not null default 'visitor' check (source in ('visitor', 'admin')),
  created_at timestamptz not null default now()
);

create index if not exists cabinet_reviews_created_at_idx
  on public.cabinet_reviews (created_at desc);

alter table public.cabinet_reviews enable row level security;
revoke all on public.cabinet_reviews from public, anon, authenticated;
grant all on public.cabinet_reviews to service_role;

commit;
