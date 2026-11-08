begin;

alter table public.cabinet_appointments
  drop constraint if exists cabinet_appointments_email_status_check;
alter table public.cabinet_appointments
  add constraint cabinet_appointments_email_status_check
  check (email_status in ('pending', 'sending', 'accepted', 'failed', 'not_requested', 'not_configured'));

alter table public.cabinet_contact_questions
  drop constraint if exists cabinet_contact_questions_email_status_check;
alter table public.cabinet_contact_questions
  add constraint cabinet_contact_questions_email_status_check
  check (email_status in ('pending', 'sending', 'accepted', 'failed', 'not_requested', 'not_configured'));

alter table public.cabinet_messaging_settings
  add column if not exists gmail_enabled boolean not null default false,
  add column if not exists gmail_validated_at timestamptz;

comment on column public.cabinet_messaging_settings.gmail_enabled is
  'Gmail API confirmations remain disabled until OAuth credentials are validated by the administrator.';

commit;
