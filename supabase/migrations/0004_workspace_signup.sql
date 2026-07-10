-- 0004_workspace_signup.sql
-- What: a single Postgres function that creates a workspace and its owner membership atomically.
-- Why: doing this as two client-side calls (insert workspace, then insert membership) risks a
-- workspace with no owner if the second call fails — a partial state with no clean recovery. One
-- function call is one transaction; it either fully succeeds or fully rolls back.

create function create_workspace_with_owner(workspace_name text, workspace_slug text)
returns workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace workspaces;
begin
  insert into workspaces (name, slug)
  values (workspace_name, workspace_slug)
  returning * into new_workspace;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace.id, auth.uid(), 'owner');

  return new_workspace;
end;
$$;

-- Auto-link pending invites: when a new auth user is created, any workspace_invites row matching
-- their email becomes a real workspace_members row. Why a trigger on auth.users rather than an
-- application-code check on login: it must fire exactly once, at the moment identity is established,
-- regardless of which client (dashboard signup, magic link, etc.) created the user.
create function link_pending_workspace_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into workspace_members (workspace_id, user_id, role)
  select workspace_id, new.id, role
  from workspace_invites
  where email = new.email
  on conflict (workspace_id, user_id) do nothing;

  delete from workspace_invites where email = new.email;

  return new;
end;
$$;

create trigger on_auth_user_created_link_invites
  after insert on auth.users
  for each row
  execute function link_pending_workspace_invites();
