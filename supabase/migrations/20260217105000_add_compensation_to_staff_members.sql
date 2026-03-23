-- Add compensation fields to staff_members table (matching client_staff structure)
alter table public.staff_members add column if not exists basic_wage numeric;
alter table public.staff_members add column if not exists employer_nics numeric;
alter table public.staff_members add column if not exists employer_pension numeric;
alter table public.staff_members add column if not exists holiday_allowance integer default 28;
alter table public.staff_members add column if not exists commission_breakdown jsonb;

-- Add comments for clarity
comment on column public.staff_members.basic_wage is 'Monthly basic wage in GBP';
comment on column public.staff_members.employer_nics is 'Monthly employer National Insurance contributions in GBP';
comment on column public.staff_members.employer_pension is 'Monthly employer pension contribution in GBP';
comment on column public.staff_members.holiday_allowance is 'Annual holiday allowance in days';
comment on column public.staff_members.commission_breakdown is 'JSON structure: {sales: [{id, label, type, value}], lettings: [{id, label, type, value}]}';
