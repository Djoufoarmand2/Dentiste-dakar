begin;

alter table public.cabinet_appointments
  alter column email drop not null,
  add column if not exists contact_channel text not null default 'email',
  add column if not exists whatsapp_consent boolean not null default false,
  add column if not exists email_status text not null default 'not_requested',
  add column if not exists whatsapp_status text not null default 'not_requested',
  add column if not exists whatsapp_provider_message_id text,
  add column if not exists contact_validated boolean not null default false,
  add column if not exists reply_status text not null default 'not_replied';
grant update on public.cabinet_appointments to service_role;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_contact_channel_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_contact_channel_check
      check (contact_channel in ('email', 'whatsapp', 'both'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_contact_email_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_contact_email_check
      check (contact_channel not in ('email', 'both') or email is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_whatsapp_consent_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_whatsapp_consent_check
      check (contact_channel not in ('whatsapp', 'both') or whatsapp_consent);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_email_status_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_email_status_check
      check (email_status in ('pending', 'accepted', 'failed', 'not_requested', 'not_configured'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_whatsapp_status_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_whatsapp_status_check
      check (whatsapp_status in ('pending', 'sending', 'accepted', 'failed', 'not_requested', 'not_configured'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cabinet_appointments_reply_status_check') then
    alter table public.cabinet_appointments add constraint cabinet_appointments_reply_status_check
      check (reply_status in ('not_replied', 'draft_opened', 'replied'));
  end if;
end $$;

create table if not exists public.cabinet_contact_questions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  name text not null default '' check (char_length(name) <= 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  message text not null check (char_length(message) between 5 and 2000),
  contact_channel text not null check (contact_channel in ('email', 'whatsapp', 'both')),
  whatsapp_consent boolean not null default false,
  email_status text not null default 'not_requested'
    check (email_status in ('pending', 'accepted', 'failed', 'not_requested', 'not_configured')),
  whatsapp_status text not null default 'not_requested'
    check (whatsapp_status in ('pending', 'sending', 'accepted', 'failed', 'not_requested', 'not_configured')),
  whatsapp_provider_message_id text,
  contact_validated boolean not null default false,
  reply_status text not null default 'not_replied'
    check (reply_status in ('not_replied', 'draft_opened', 'replied')),
  created_at timestamptz not null default now(),
  constraint cabinet_contact_questions_channel_email_check
    check (contact_channel not in ('email', 'both') or email is not null),
  constraint cabinet_contact_questions_whatsapp_consent_check
    check (contact_channel not in ('whatsapp', 'both') or (phone is not null and whatsapp_consent))
);

create index if not exists cabinet_contact_questions_created_idx
  on public.cabinet_contact_questions(created_at desc);

alter table public.cabinet_contact_questions enable row level security;
revoke all on public.cabinet_contact_questions from public, anon, authenticated;
grant select, insert, update, delete on public.cabinet_contact_questions to service_role;
comment on table public.cabinet_contact_questions is
  'Private public-site contact questions. Access only through the administrator-checked Edge Function; manual retention/deletion by the cabinet.';

create table if not exists public.cabinet_messaging_settings (
  id boolean primary key default true check (id),
  email_auto_responder_active boolean not null default false,
  whatsapp_enabled boolean not null default false,
  whatsapp_waba_id text,
  whatsapp_phone_number_id text,
  whatsapp_template_name text,
  whatsapp_template_language text not null default 'fr',
  whatsapp_validated_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.cabinet_messaging_settings enable row level security;
revoke all on public.cabinet_messaging_settings from public, anon, authenticated;
grant select, insert, update on public.cabinet_messaging_settings to service_role;
insert into public.cabinet_messaging_settings(id) values (true) on conflict (id) do nothing;

comment on table public.cabinet_messaging_settings is
  'Private, administrator-managed confirmation channel settings. WhatsApp remains disabled until an approved template and phone number are validated; provider tokens are stored only as Edge Function secrets.';

commit;
