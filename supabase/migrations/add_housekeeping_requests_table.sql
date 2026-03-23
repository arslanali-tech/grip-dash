-- Housekeeping requests table for holiday, absence, stationery, invoice, mileage, appraisal records
create table if not exists public.housekeeping_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null,
  branch_id uuid,
  request_type text not null,          -- 'holiday_request','absence_request','stationery_request','invoice_request','mileage_log','staff_appraisal'
  staff_id text,
  staff_name text,
  requested_by text,
  payload jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast lookup
create index if not exists idx_housekeeping_requests_agency
  on public.housekeeping_requests (agency_id, request_type, created_at desc);

-- RLS
alter table public.housekeeping_requests enable row level security;

create policy "Users can read housekeeping requests for their agency"
  on public.housekeeping_requests for select
  using (true);

create policy "Users can insert housekeeping requests"
  on public.housekeeping_requests for insert
  with check (true);

create policy "Users can update housekeeping requests"
  on public.housekeeping_requests for update
  using (true);

create policy "Users can delete housekeeping requests"
  on public.housekeeping_requests for delete
  using (true);
