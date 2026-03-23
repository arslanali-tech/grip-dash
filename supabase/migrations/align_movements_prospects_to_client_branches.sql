-- Align movements/prospects branch_id to client_branches

-- Movements: drop old FK and clean invalid branch references
alter table public.movements
  drop constraint if exists movements_branch_id_fkey;

update public.movements m
set branch_id = null
where branch_id is not null
  and not exists (
    select 1 from public.client_branches cb
    where cb.id = m.branch_id
  );

alter table public.movements
  add constraint movements_branch_id_fkey
  foreign key (branch_id) references public.client_branches(id) on delete set null;

-- Prospects: drop old FK and clean invalid branch references
alter table public.prospects
  drop constraint if exists prospects_branch_id_fkey;

update public.prospects p
set branch_id = null
where branch_id is not null
  and not exists (
    select 1 from public.client_branches cb
    where cb.id = p.branch_id
  );

alter table public.prospects
  add constraint prospects_branch_id_fkey
  foreign key (branch_id) references public.client_branches(id) on delete set null;
