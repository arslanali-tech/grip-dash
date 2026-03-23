-- Hub Documents & Folders backend
-- Adds:
--  - public.hub_folders (folder hierarchy for document organization)
--  - public.hub_documents (file metadata, linked to Supabase Storage)
-- Plus indexes and RLS policies for client + staff roles.

-- =============================
-- Hub Folders
-- =============================
create table if not exists public.hub_folders (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete set null,
  parent_folder_id uuid references public.hub_folders(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_folders_agency_idx on public.hub_folders (agency_id);
create index if not exists hub_folders_parent_idx on public.hub_folders (parent_folder_id);
create index if not exists hub_folders_branch_idx on public.hub_folders (branch_id);

alter table public.hub_folders enable row level security;

-- Drop policies so migration is re-runnable
drop policy if exists "client_select_hub_folders" on public.hub_folders;
drop policy if exists "client_insert_hub_folders" on public.hub_folders;
drop policy if exists "client_update_hub_folders" on public.hub_folders;
drop policy if exists "client_delete_hub_folders" on public.hub_folders;
drop policy if exists "staff_select_hub_folders" on public.hub_folders;

-- Client (agency) users can manage all folders within their agency
create policy "client_select_hub_folders"
on public.hub_folders
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_folders.agency_id
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

create policy "client_insert_hub_folders"
on public.hub_folders
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_folders.agency_id
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

create policy "client_update_hub_folders"
on public.hub_folders
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_folders.agency_id
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
    where c.agency_id = hub_folders.agency_id
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

create policy "client_delete_hub_folders"
on public.hub_folders
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_folders.agency_id
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

-- Staff can view public folders and folders in their branch
create policy "staff_select_hub_folders"
on public.hub_folders
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_folders.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and (
    hub_folders.is_public = true
    or hub_folders.branch_id is null
    or hub_folders.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  )
);

-- =============================
-- Hub Documents
-- =============================
create table if not exists public.hub_documents (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  branch_id uuid references public.client_branches(id) on delete set null,
  folder_id uuid references public.hub_folders(id) on delete set null,
  name text not null,
  original_filename text not null,
  file_size bigint not null default 0,
  mime_type text,
  storage_path text not null,
  category text not null default 'General',
  is_public boolean not null default false,
  is_date_sensitive boolean not null default false,
  reminder_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hub_documents_agency_idx on public.hub_documents (agency_id);
create index if not exists hub_documents_folder_idx on public.hub_documents (folder_id);
create index if not exists hub_documents_branch_idx on public.hub_documents (branch_id);
create index if not exists hub_documents_category_idx on public.hub_documents (agency_id, category);
create index if not exists hub_documents_name_idx on public.hub_documents (agency_id, name);

alter table public.hub_documents enable row level security;

-- Drop policies so migration is re-runnable
drop policy if exists "client_select_hub_documents" on public.hub_documents;
drop policy if exists "client_insert_hub_documents" on public.hub_documents;
drop policy if exists "client_update_hub_documents" on public.hub_documents;
drop policy if exists "client_delete_hub_documents" on public.hub_documents;
drop policy if exists "staff_select_hub_documents" on public.hub_documents;

-- Client (agency) users can manage all documents within their agency
create policy "client_select_hub_documents"
on public.hub_documents
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_documents.agency_id
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

create policy "client_insert_hub_documents"
on public.hub_documents
for insert
with check (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_documents.agency_id
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

create policy "client_update_hub_documents"
on public.hub_documents
for update
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_documents.agency_id
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
    where c.agency_id = hub_documents.agency_id
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

create policy "client_delete_hub_documents"
on public.hub_documents
for delete
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_documents.agency_id
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

-- Staff can view public documents and documents in their branch
create policy "staff_select_hub_documents"
on public.hub_documents
for select
using (
  exists (
    select 1
    from public.clients c
    where c.agency_id = hub_documents.agency_id
      and c.id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
      and (auth.jwt() -> 'user_metadata' ->> 'role')::text in ('branch_manager','negotiator','prospector')
  )
  and (
    hub_documents.is_public = true
    or hub_documents.branch_id is null
    or hub_documents.branch_id::text = (auth.jwt() -> 'user_metadata' ->> 'branch_id')::text
  )
);

-- =============================
-- Storage bucket setup (run manually in Supabase dashboard or via SQL)
-- =============================
-- Note: Storage bucket creation is typically done via the Supabase dashboard.
-- Create a bucket named 'hub-documents' with the following settings:
-- - Public: false (use signed URLs for access)
-- - File size limit: 50MB (or as needed)
-- - Allowed MIME types: application/pdf, image/*, application/msword, 
--   application/vnd.openxmlformats-officedocument.*, text/*

-- Storage RLS policies (example, adjust as needed):
-- insert into storage.buckets (id, name, public) values ('hub-documents', 'hub-documents', false);
-- 
-- create policy "Authenticated users can upload to hub-documents"
-- on storage.objects for insert
-- with check (bucket_id = 'hub-documents' and auth.role() = 'authenticated');
--
-- create policy "Users can view their agency files"
-- on storage.objects for select
-- using (bucket_id = 'hub-documents' and auth.role() = 'authenticated');
--
-- create policy "Users can delete their uploads"
-- on storage.objects for delete
-- using (bucket_id = 'hub-documents' and auth.role() = 'authenticated');
