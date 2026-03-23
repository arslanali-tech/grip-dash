-- Diary (calendar) + Tasks backend
-- Adds:
--  - public.diary_events
--  - public.tasks
--  - public.task_feedback
--  - public.mileage_logs
-- Plus indexes and RLS policies for client + staff roles.

-- =============================
-- Diary events
-- =============================
create table if not exists public.diary_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete set null,
  -- When set, this event belongs to a specific staff member (personal diary)
  staff_id uuid references public.client_staff(id) on delete set null,
  title text not null,
  description text,
  category text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  location text,
  guest_emails text[],
  vendor_name text,
  property_address text,
  feedback jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diary_events_end_after_start check (end_at >= start_at)
);

create index if not exists diary_events_agency_start_idx on public.diary_events (agency_id, start_at);
create index if not exists diary_events_branch_start_idx on public.diary_events (branch_id, start_at);
create index if not exists diary_events_staff_start_idx on public.diary_events (staff_id, start_at);

alter table public.diary_events enable row level security;

-- Drop policies so migration is re-runnable
drop policy if exists "client_select_diary_events" on public.diary_events;
drop policy if exists "client_insert_diary_events" on public.diary_events;
drop policy if exists "client_update_diary_events" on public.diary_events;
drop policy if exists "client_delete_diary_events" on public.diary_events;

drop policy if exists "staff_select_diary_events" on public.diary_events;
drop policy if exists "branch_manager_insert_diary_events" on public.diary_events;
drop policy if exists "branch_manager_update_diary_events" on public.diary_events;
drop policy if exists "branch_manager_delete_diary_events" on public.diary_events;

drop policy if exists "staff_insert_own_diary_events" on public.diary_events;
drop policy if exists "staff_update_own_diary_events" on public.diary_events;
drop policy if exists "staff_delete_own_diary_events" on public.diary_events;

-- Client (agency) users can manage all diary events within their agency
create policy "client_select_diary_events"
on public.diary_events
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_insert_diary_events"
on public.diary_events
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
  and (
    diary_events.branch_id is null
    or exists (
      select 1
      from public.client_branches cb
      join public.clients c on c.id = cb.client_id
      where cb.id = diary_events.branch_id
        and c.agency_id = diary_events.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
            and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          )
        )
    )
  )
);

create policy "client_update_diary_events"
on public.diary_events
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
  and (
    diary_events.branch_id is null
    or exists (
      select 1
      from public.client_branches cb
      join public.clients c on c.id = cb.client_id
      where cb.id = diary_events.branch_id
        and c.agency_id = diary_events.agency_id
        and (
          lower(c.email) = lower(auth.jwt() ->> 'email')
          or c.id::text = auth.jwt() ->> 'client_id'
          or (
            (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
            and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          )
        )
    )
  )
);

create policy "client_delete_diary_events"
on public.diary_events
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

-- Staff can read diary events for:
--  - their branch (shared diary)
--  - their own staff events
--  - agency-wide events (branch_id is null)
create policy "staff_select_diary_events"
on public.diary_events
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and (
    diary_events.branch_id is null
    or diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
    or diary_events.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
  )
);

-- Branch managers can manage all diary events for their branch
create policy "branch_manager_insert_diary_events"
on public.diary_events
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and (
    diary_events.staff_id is null
    or exists (
      select 1
      from public.client_staff cs
      where cs.id = diary_events.staff_id
        and cs.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        and cs.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
    )
  )
);

create policy "branch_manager_update_diary_events"
on public.diary_events
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

create policy "branch_manager_delete_diary_events"
on public.diary_events
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

-- Negotiators / Prospectors can create and manage only their own personal diary events
create policy "staff_insert_own_diary_events"
on public.diary_events
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and diary_events.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and diary_events.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

create policy "staff_update_own_diary_events"
on public.diary_events
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and diary_events.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and diary_events.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

create policy "staff_delete_own_diary_events"
on public.diary_events
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = diary_events.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and diary_events.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

-- =============================
-- Tasks
-- =============================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete set null,
  title text not null,
  description text,
  category text not null default 'general',
  status text not null default 'todo',
  due_at timestamptz,
  show_on_calendar boolean not null default false,
  recurrence text not null default 'none',
  assigned_to_staff_id uuid references public.client_staff(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint tasks_status_check check (status in ('todo','in_progress','done')),
  constraint tasks_recurrence_check check (recurrence in ('none','daily','weekly','monthly'))
);

create index if not exists tasks_agency_due_idx on public.tasks (agency_id, due_at);
create index if not exists tasks_branch_due_idx on public.tasks (branch_id, due_at);
create index if not exists tasks_assignee_due_idx on public.tasks (assigned_to_staff_id, due_at);

alter table public.tasks enable row level security;

drop policy if exists "client_select_tasks" on public.tasks;
drop policy if exists "client_insert_tasks" on public.tasks;
drop policy if exists "client_update_tasks" on public.tasks;
drop policy if exists "client_delete_tasks" on public.tasks;

drop policy if exists "branch_manager_select_tasks" on public.tasks;
drop policy if exists "branch_manager_insert_tasks" on public.tasks;
drop policy if exists "branch_manager_update_tasks" on public.tasks;
drop policy if exists "branch_manager_delete_tasks" on public.tasks;

drop policy if exists "staff_select_own_tasks" on public.tasks;
drop policy if exists "staff_insert_own_tasks" on public.tasks;
drop policy if exists "staff_update_own_tasks" on public.tasks;
drop policy if exists "staff_delete_own_tasks" on public.tasks;

-- Client users: full access within their agency
create policy "client_select_tasks"
on public.tasks
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_insert_tasks"
on public.tasks
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_update_tasks"
on public.tasks
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_delete_tasks"
on public.tasks
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

-- Branch managers: team tasks for their branch
create policy "branch_manager_select_tasks"
on public.tasks
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

create policy "branch_manager_insert_tasks"
on public.tasks
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and (
    tasks.assigned_to_staff_id is null
    or exists (
      select 1
      from public.client_staff cs
      where cs.id = tasks.assigned_to_staff_id
        and cs.client_id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        and cs.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
    )
  )
);

create policy "branch_manager_update_tasks"
on public.tasks
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

create policy "branch_manager_delete_tasks"
on public.tasks
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

-- Negotiators / Prospectors: only tasks assigned to themselves
create policy "staff_select_own_tasks"
on public.tasks
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and tasks.assigned_to_staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

create policy "staff_insert_own_tasks"
on public.tasks
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and tasks.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and tasks.assigned_to_staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
  and tasks.created_by = auth.uid()
);

create policy "staff_update_own_tasks"
on public.tasks
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and tasks.assigned_to_staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
)
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and tasks.assigned_to_staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

create policy "staff_delete_own_tasks"
on public.tasks
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = tasks.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and tasks.assigned_to_staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

-- =============================
-- Task feedback
-- =============================
create table if not exists public.task_feedback (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  comment text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists task_feedback_task_created_idx on public.task_feedback (task_id, created_at desc);

alter table public.task_feedback enable row level security;

drop policy if exists "task_feedback_select" on public.task_feedback;
drop policy if exists "task_feedback_insert" on public.task_feedback;
drop policy if exists "task_feedback_delete_own" on public.task_feedback;

-- If the user can see the parent task (via tasks RLS), they can see feedback.
create policy "task_feedback_select"
on public.task_feedback
for select
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_feedback.task_id
  )
);

-- Allow adding feedback to any task the user can see.
create policy "task_feedback_insert"
on public.task_feedback
for insert
with check (
  task_feedback.created_by = auth.uid()
  and exists (
    select 1 from public.tasks t
    where t.id = task_feedback.task_id
  )
);

create policy "task_feedback_delete_own"
on public.task_feedback
for delete
using (
  task_feedback.created_by = auth.uid()
);

-- =============================
-- Mileage logs (optionally linked to diary events and/or tasks)
-- =============================
create table if not exists public.mileage_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete set null,
  staff_id uuid references public.client_staff(id) on delete set null,
  diary_event_id uuid references public.diary_events(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  start_location text not null,
  end_location text not null,
  distance numeric not null,
  is_return_trip boolean not null default true,
  total_distance numeric not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mileage_logs_agency_logged_idx on public.mileage_logs (agency_id, logged_at desc);
create index if not exists mileage_logs_staff_logged_idx on public.mileage_logs (staff_id, logged_at desc);

alter table public.mileage_logs enable row level security;

drop policy if exists "client_select_mileage_logs" on public.mileage_logs;
drop policy if exists "client_insert_mileage_logs" on public.mileage_logs;
drop policy if exists "branch_manager_select_mileage_logs" on public.mileage_logs;
drop policy if exists "staff_select_own_mileage_logs" on public.mileage_logs;
drop policy if exists "staff_insert_own_mileage_logs" on public.mileage_logs;
drop policy if exists "staff_delete_own_mileage_logs" on public.mileage_logs;

-- Clients: view mileage logs for their agency
create policy "client_select_mileage_logs"
on public.mileage_logs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = mileage_logs.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

create policy "client_insert_mileage_logs"
on public.mileage_logs
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = mileage_logs.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('client','agency_user')
          and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
        )
      )
  )
);

-- Branch managers: view logs for their branch
create policy "branch_manager_select_mileage_logs"
on public.mileage_logs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = mileage_logs.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
  )
  and mileage_logs.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
);

-- Negotiators/Prospectors: view only their own logs
create policy "staff_select_own_mileage_logs"
on public.mileage_logs
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = mileage_logs.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('negotiator','prospector')
  )
  and mileage_logs.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

-- Staff can insert mileage logs only for themselves
create policy "staff_insert_own_mileage_logs"
on public.mileage_logs
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = mileage_logs.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and mileage_logs.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  and mileage_logs.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);

create policy "staff_delete_own_mileage_logs"
on public.mileage_logs
for delete
using (
  mileage_logs.staff_id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
);
