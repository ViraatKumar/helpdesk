-- 0010_workspaces_rls_public.sql
-- What: Update the RLS policy on workspaces to allow any authenticated user to view workspace details.
-- Why: Necessary for the global workspace directory feature, allowing users to see what workspaces exist
-- so they can request access.

drop policy if exists workspaces_select_members on workspaces;

create policy workspaces_select_authenticated on workspaces
  for select to authenticated using (true);
