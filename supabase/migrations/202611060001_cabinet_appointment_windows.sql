begin;

alter table public.cabinet_appointments
  add column if not exists preferred_window text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cabinet_appointments_preferred_window_check'
      and conrelid = 'public.cabinet_appointments'::regclass
  ) then
    alter table public.cabinet_appointments
      add constraint cabinet_appointments_preferred_window_check
      check (preferred_window is null or preferred_window in ('weekdays', 'saturday'));
  end if;
end $$;

update public.cabinet_site_content
set content = jsonb_set(
  jsonb_set(
    content,
    '{clinic,openingHours}',
    to_jsonb('Du lundi au vendredi · 16h00–19h00 (sur rendez-vous)
Samedi · 10h00–14h00 (sur rendez-vous)'::text),
    true
  ),
  '{clinic,openingHoursEn}',
  to_jsonb('Monday to Friday · 4:00–7:00 pm (by appointment)
Saturday · 10:00 am–2:00 pm (by appointment)'::text),
  true
), version = version + 1, updated_at = now()
where id and content ? 'clinic';

comment on column public.cabinet_appointments.preferred_window is
  'Optional preferred opening period: weekdays or Saturday. This is not a confirmed appointment.';

commit;
