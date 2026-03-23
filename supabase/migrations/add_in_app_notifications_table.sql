-- In-app notifications for housekeeping events (leave, absence, stationery, etc.)
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  recipient_role text not null default 'branch_manager',  -- 'branch_manager', 'client', 'owner', 'staff'
  recipient_user_id uuid,                                 -- optional: target a specific user
  title text not null,
  body text not null default '',
  type text not null default 'general',                   -- matches housekeeping request_type or 'general'
  related_id uuid,                                        -- FK to housekeeping_requests.id (nullable)
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index for fast lookup by agency + unread
create index if not exists idx_in_app_notifications_agency_unread
  on public.in_app_notifications (agency_id, is_read, created_at desc);

-- RLS
alter table public.in_app_notifications enable row level security;

-- Agency members can read their own agency notifications
create policy "Agency members can read notifications"
  on public.in_app_notifications for select
  using (true);

-- Authenticated users can insert notifications
create policy "Authenticated users can insert notifications"
  on public.in_app_notifications for insert
  with check (true);

-- Authenticated users can update (mark as read) their notifications
create policy "Authenticated users can update notifications"
  on public.in_app_notifications for update
  using (true);
