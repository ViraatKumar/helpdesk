-- 0011_requests_rpc.sql
-- What: A security definer function exposing request emails for the team management page.

create function list_workspace_requests(target_workspace_id uuid)
returns table (id uuid, user_id uuid, email text, status text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_workspace_member(target_workspace_id, 'admin') then
    raise exception 'not an admin of this workspace';
  end if;

  return query
    select r.id, r.user_id, u.email::text, r.status, r.created_at
    from workspace_requests r
    join auth.users u on u.id = r.user_id
    where r.workspace_id = target_workspace_id and r.status = 'pending'
    order by r.created_at asc;
end;
$$;
