-- 0009_workspace_requests.sql
-- What: A table to track user requests to join existing workspaces.
-- Why: Allows a self-serve access model where users can discover workspaces and request to join them.

create table workspace_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

alter table workspace_requests enable row level security;

-- Users can view their own requests
create policy workspace_requests_select_self on workspace_requests
  for select using (user_id = auth.uid());

-- Users can insert their own requests (only as pending)
create policy workspace_requests_insert_self on workspace_requests
  for insert with check (
    user_id = auth.uid() 
    and status = 'pending'
  );

-- Workspace admins/owners can view requests for their workspace
create policy workspace_requests_select_admin on workspace_requests
  for select using (is_workspace_member(workspace_id, 'admin'));

-- Workspace admins/owners can update requests for their workspace
create policy workspace_requests_update_admin on workspace_requests
  for update using (is_workspace_member(workspace_id, 'admin'))
  with check (is_workspace_member(workspace_id, 'admin'));
