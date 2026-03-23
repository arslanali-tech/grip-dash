-- Allow branch managers to read their client row (for agency resolution)

drop policy if exists "branch_manager_select_own_client" on public.clients;

create policy "branch_manager_select_own_client"
on public.clients
for select
using (
  id::text = (auth.jwt() -> 'user_metadata' ->> 'client_id')::text
  and (auth.jwt() -> 'user_metadata' ->> 'role')::text = 'branch_manager'
);
