alter table public.movements
  add column if not exists viewing_arrangements text,
  add column if not exists viewing_notes text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'movements_viewing_arrangements_check'
  ) then
    alter table public.movements
      add constraint movements_viewing_arrangements_check
      check (
        viewing_arrangements is null
        or viewing_arrangements in (
          'book-by-appointment',
          'keys-held',
          'keys-with-agent',
          'other'
        )
      );
  end if;
end $$;
