-- 0007_team_management_rpc.sql
-- What: a security definer function exposing member email addresses for the team management page.
-- Why: auth.users lives in a schema PostgREST does not expose, and for good reason (it holds
-- password hashes). This function is the one deliberate, narrow window into it — it returns only
-- id/email/created_at, and only for members of a workspace the caller already belongs to.

create function list_workspace_members(target_workspace_id uuid)
returns table (user_id uuid, email text, role text, member_since timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_workspace_member(target_workspace_id) then
    raise exception 'not a member of this workspace';
  end if;

  return query
    select wm.user_id, u.email::text, wm.role, wm.created_at
    from workspace_members wm
    join auth.users u on u.id = wm.user_id
    where wm.workspace_id = target_workspace_id
    order by wm.created_at asc;
end;
$$;
