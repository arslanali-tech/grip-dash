-- Team Chat Complete: Base Tables + Enhancements
-- This migration creates all team chat functionality:
-- 1. team_channels table for chat channels
-- 2. team_messages table for channel messages
-- 3. team_message_reactions table for emoji reactions
-- 4. team_direct_messages table for private 1:1 messaging
-- 5. RLS policies for owner, client, branch_manager, and client_staff

-- =============================
-- Base Tables (team_channels, team_messages)
-- =============================

create table if not exists public.team_channels (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Avoid duplicate channels per agency/branch
do $$
begin
  alter table public.team_channels
    add constraint team_channels_unique unique (agency_id, branch_id, name);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id),
  channel_id uuid not null references public.team_channels(id) on delete cascade,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz,
  is_edited boolean default false
);

alter table public.team_channels enable row level security;
alter table public.team_messages enable row level security;

-- =============================
-- Team Message Reactions Table
-- =============================

create table if not exists public.team_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.team_messages(id) on delete cascade,
  user_id uuid not null,
  user_name text,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);

create index if not exists team_message_reactions_message_id_idx on public.team_message_reactions(message_id);

alter table public.team_message_reactions enable row level security;

-- =============================
-- Team Direct Messages Table
-- =============================

create table if not exists public.team_direct_messages (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  sender_id uuid not null,
  sender_name text,
  sender_avatar text,
  recipient_id uuid not null,
  recipient_name text,
  content text not null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists team_direct_messages_agency_id_idx on public.team_direct_messages(agency_id);
create index if not exists team_direct_messages_sender_id_idx on public.team_direct_messages(sender_id);
create index if not exists team_direct_messages_recipient_id_idx on public.team_direct_messages(recipient_id);

alter table public.team_direct_messages enable row level security;

-- =============================
-- Helper function: Check if user is client_staff for agency
-- =============================

create or replace function public.is_client_staff_for_agency(target_agency_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.client_staff cs
    join public.clients c on c.id = cs.client_id
    where c.agency_id = target_agency_id
      and (
        lower(cs.email) = lower(auth.jwt() ->> 'email')
        or cs.id::text = (auth.jwt() -> 'user_metadata' ->> 'staff_id')::text
      )
  );
end;
$$ language plpgsql security definer;

-- =============================
-- RLS Policies for team_message_reactions
-- =============================

-- Owner policies
create policy "owner_select_team_message_reactions"
on public.team_message_reactions
for select
using (
  exists (
    select 1 from public.team_messages tm
    join public.agencies a on a.id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_team_message_reactions"
on public.team_message_reactions
for insert
with check (
  exists (
    select 1 from public.team_messages tm
    join public.agencies a on a.id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_team_message_reactions"
on public.team_message_reactions
for delete
using (
  exists (
    select 1 from public.team_messages tm
    join public.agencies a on a.id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and a.owner_user_id = auth.uid()
  )
  and team_message_reactions.user_id = auth.uid()
);

-- Client/Branch manager policies for reactions
create policy "client_or_branch_manager_select_team_message_reactions"
on public.team_message_reactions
for select
using (
  exists (
    select 1 from public.team_messages tm
    join public.clients c on c.agency_id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_insert_team_message_reactions"
on public.team_message_reactions
for insert
with check (
  exists (
    select 1 from public.team_messages tm
    join public.clients c on c.agency_id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_delete_team_message_reactions"
on public.team_message_reactions
for delete
using (
  exists (
    select 1 from public.team_messages tm
    join public.clients c on c.agency_id = tm.agency_id
    where tm.id = team_message_reactions.message_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
  and team_message_reactions.user_id = auth.uid()
);

-- Client staff policies for reactions
create policy "client_staff_select_team_message_reactions"
on public.team_message_reactions
for select
using (
  exists (
    select 1 from public.team_messages tm
    where tm.id = team_message_reactions.message_id
      and is_client_staff_for_agency(tm.agency_id)
  )
);

create policy "client_staff_insert_team_message_reactions"
on public.team_message_reactions
for insert
with check (
  exists (
    select 1 from public.team_messages tm
    where tm.id = team_message_reactions.message_id
      and is_client_staff_for_agency(tm.agency_id)
  )
);

create policy "client_staff_delete_team_message_reactions"
on public.team_message_reactions
for delete
using (
  exists (
    select 1 from public.team_messages tm
    where tm.id = team_message_reactions.message_id
      and is_client_staff_for_agency(tm.agency_id)
  )
  and team_message_reactions.user_id = auth.uid()
);

-- =============================
-- RLS Policies for team_direct_messages
-- =============================

-- Owner policies for direct messages
create policy "owner_select_team_direct_messages"
on public.team_direct_messages
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_direct_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_team_direct_messages"
on public.team_direct_messages
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = team_direct_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_team_direct_messages"
on public.team_direct_messages
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_direct_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_team_direct_messages"
on public.team_direct_messages
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_direct_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- Client/Branch manager policies for direct messages (can only see their own messages)
create policy "client_or_branch_manager_select_team_direct_messages"
on public.team_direct_messages
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_direct_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
  and (team_direct_messages.sender_id = auth.uid() or team_direct_messages.recipient_id = auth.uid())
);

create policy "client_or_branch_manager_insert_team_direct_messages"
on public.team_direct_messages
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_direct_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
  and team_direct_messages.sender_id = auth.uid()
);

create policy "client_or_branch_manager_update_team_direct_messages"
on public.team_direct_messages
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_direct_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
  and (team_direct_messages.sender_id = auth.uid() or team_direct_messages.recipient_id = auth.uid())
);

create policy "client_or_branch_manager_delete_team_direct_messages"
on public.team_direct_messages
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_direct_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
  and team_direct_messages.sender_id = auth.uid()
);

-- Client staff policies for direct messages
create policy "client_staff_select_team_direct_messages"
on public.team_direct_messages
for select
using (
  is_client_staff_for_agency(team_direct_messages.agency_id)
  and (team_direct_messages.sender_id = auth.uid() or team_direct_messages.recipient_id = auth.uid())
);

create policy "client_staff_insert_team_direct_messages"
on public.team_direct_messages
for insert
with check (
  is_client_staff_for_agency(team_direct_messages.agency_id)
  and team_direct_messages.sender_id = auth.uid()
);

create policy "client_staff_update_team_direct_messages"
on public.team_direct_messages
for update
using (
  is_client_staff_for_agency(team_direct_messages.agency_id)
  and (team_direct_messages.sender_id = auth.uid() or team_direct_messages.recipient_id = auth.uid())
);

create policy "client_staff_delete_team_direct_messages"
on public.team_direct_messages
for delete
using (
  is_client_staff_for_agency(team_direct_messages.agency_id)
  and team_direct_messages.sender_id = auth.uid()
);

-- =============================
-- Owner policies for team_channels
-- =============================

drop policy if exists "owner_select_own_team_channels" on public.team_channels;
drop policy if exists "owner_insert_own_team_channels" on public.team_channels;
drop policy if exists "owner_update_own_team_channels" on public.team_channels;
drop policy if exists "owner_delete_own_team_channels" on public.team_channels;

create policy "owner_select_own_team_channels"
on public.team_channels
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_channels.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_team_channels"
on public.team_channels
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = team_channels.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_team_channels"
on public.team_channels
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_channels.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = team_channels.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_team_channels"
on public.team_channels
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_channels.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- =============================
-- Owner policies for team_messages
-- =============================

drop policy if exists "owner_select_own_team_messages" on public.team_messages;
drop policy if exists "owner_insert_own_team_messages" on public.team_messages;
drop policy if exists "owner_update_own_team_messages" on public.team_messages;
drop policy if exists "owner_delete_own_team_messages" on public.team_messages;

create policy "owner_select_own_team_messages"
on public.team_messages
for select
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_insert_own_team_messages"
on public.team_messages
for insert
with check (
  exists (
    select 1 from public.agencies a
    where a.id = team_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_update_own_team_messages"
on public.team_messages
for update
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.agencies a
    where a.id = team_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

create policy "owner_delete_own_team_messages"
on public.team_messages
for delete
using (
  exists (
    select 1 from public.agencies a
    where a.id = team_messages.agency_id
      and a.owner_user_id = auth.uid()
  )
);

-- =============================
-- Client + Branch manager policies for team_channels
-- =============================

drop policy if exists "client_or_branch_manager_select_team_channels" on public.team_channels;
drop policy if exists "client_or_branch_manager_insert_team_channels" on public.team_channels;
drop policy if exists "client_or_branch_manager_update_team_channels" on public.team_channels;
drop policy if exists "client_or_branch_manager_delete_team_channels" on public.team_channels;

create policy "client_or_branch_manager_select_team_channels"
on public.team_channels
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_channels.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_insert_team_channels"
on public.team_channels
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_channels.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_update_team_channels"
on public.team_channels
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_channels.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_channels.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_delete_team_channels"
on public.team_channels
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_channels.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

-- =============================
-- Client + Branch manager policies for team_messages
-- =============================

drop policy if exists "client_or_branch_manager_select_team_messages" on public.team_messages;
drop policy if exists "client_or_branch_manager_insert_team_messages" on public.team_messages;
drop policy if exists "client_or_branch_manager_update_team_messages" on public.team_messages;
drop policy if exists "client_or_branch_manager_delete_team_messages" on public.team_messages;

create policy "client_or_branch_manager_select_team_messages"
on public.team_messages
for select
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_insert_team_messages"
on public.team_messages
for insert
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_update_team_messages"
on public.team_messages
for update
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

create policy "client_or_branch_manager_delete_team_messages"
on public.team_messages
for delete
using (
  exists (
    select 1 from public.clients c
    where c.agency_id = team_messages.agency_id
      and (
        lower(c.email) = lower(auth.jwt() ->> 'email')
        or c.id::text = auth.jwt() ->> 'client_id'
        or (
          c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
          and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
        )
      )
  )
);

-- =============================
-- Client staff policies for team_channels and team_messages
-- =============================

-- Client staff SELECT channels
drop policy if exists "client_staff_select_team_channels" on public.team_channels;
create policy "client_staff_select_team_channels"
on public.team_channels
for select
using (
  is_client_staff_for_agency(team_channels.agency_id)
);

-- Client staff INSERT channels
drop policy if exists "client_staff_insert_team_channels" on public.team_channels;
create policy "client_staff_insert_team_channels"
on public.team_channels
for insert
with check (
  is_client_staff_for_agency(team_channels.agency_id)
);

-- Client staff UPDATE channels
drop policy if exists "client_staff_update_team_channels" on public.team_channels;
create policy "client_staff_update_team_channels"
on public.team_channels
for update
using (
  is_client_staff_for_agency(team_channels.agency_id)
)
with check (
  is_client_staff_for_agency(team_channels.agency_id)
);

-- Client staff DELETE channels
drop policy if exists "client_staff_delete_team_channels" on public.team_channels;
create policy "client_staff_delete_team_channels"
on public.team_channels
for delete
using (
  is_client_staff_for_agency(team_channels.agency_id)
);

-- Client staff SELECT messages
drop policy if exists "client_staff_select_team_messages" on public.team_messages;
create policy "client_staff_select_team_messages"
on public.team_messages
for select
using (
  is_client_staff_for_agency(team_messages.agency_id)
);

-- Client staff INSERT messages
drop policy if exists "client_staff_insert_team_messages" on public.team_messages;
create policy "client_staff_insert_team_messages"
on public.team_messages
for insert
with check (
  is_client_staff_for_agency(team_messages.agency_id)
);

-- Client staff UPDATE messages (only own messages)
drop policy if exists "client_staff_update_team_messages" on public.team_messages;
create policy "client_staff_update_team_messages"
on public.team_messages
for update
using (
  is_client_staff_for_agency(team_messages.agency_id)
  and team_messages.sender_id = auth.uid()
)
with check (
  is_client_staff_for_agency(team_messages.agency_id)
  and team_messages.sender_id = auth.uid()
);

-- Client staff DELETE messages (only own messages)
drop policy if exists "client_staff_delete_team_messages" on public.team_messages;
create policy "client_staff_delete_team_messages"
on public.team_messages
for delete
using (
  is_client_staff_for_agency(team_messages.agency_id)
  and team_messages.sender_id = auth.uid()
);

-- Enable realtime for the new tables
alter publication supabase_realtime add table team_message_reactions;
alter publication supabase_realtime add table team_direct_messages;
