-- 0005_rls_policies.sql
-- What: row-level security on every table. Workspace members read/write only their workspace's rows.
-- Widget/public paths (anonymous chat, KB browsing) go through service-role server routes and never
-- reach the client with an anon-key session broad enough to need its own RLS carve-out, except for
-- published KB articles which the public site queries directly with the anon key.
-- Why defense in depth: middleware role checks are UX; RLS is what actually stops a curious agent
-- from reading another workspace's inbox by forging a request.

-- Helper: security definer so it can read workspace_members without recursing into that table's own
-- RLS policy (which itself calls this function).
create function is_workspace_member(target_workspace_id uuid, min_role text default 'agent')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and (
        min_role = 'agent'
        or (min_role = 'admin' and role in ('admin', 'owner'))
        or (min_role = 'owner' and role = 'owner')
      )
  );
$$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table contacts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table kb_articles enable row level security;
alter table conversation_summaries enable row level security;

-- workspaces --------------------------------------------------------------------
create policy workspaces_select_members on workspaces
  for select using (is_workspace_member(id));

create policy workspaces_update_owner on workspaces
  for update using (is_workspace_member(id, 'owner'));

-- workspace_members ---------------------------------------------------------------
create policy workspace_members_select_members on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy workspace_members_manage_admin on workspace_members
  for all using (is_workspace_member(workspace_id, 'admin'))
  with check (is_workspace_member(workspace_id, 'admin'));

-- workspace_invites -----------------------------------------------------------
create policy workspace_invites_manage_admin on workspace_invites
  for all using (is_workspace_member(workspace_id, 'admin'))
  with check (is_workspace_member(workspace_id, 'admin'));

-- contacts -------------------------------------------------------------------------
create policy contacts_all_members on contacts
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- conversations ------------------------------------------------------------------
create policy conversations_all_members on conversations
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- messages ------------------------------------------------------------------------
-- No workspace_id column on messages, so the policy joins through conversations.
create policy messages_select_members on messages
  for select using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and is_workspace_member(conversations.workspace_id)
    )
  );

create policy messages_insert_agents on messages
  for insert with check (
    sender_type = 'agent'
    and sender_id = auth.uid()
    and exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and is_workspace_member(conversations.workspace_id)
    )
  );

create policy messages_update_agents on messages
  for update using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and is_workspace_member(conversations.workspace_id)
    )
  );

-- kb_articles ----------------------------------------------------------------------
create policy kb_articles_manage_members on kb_articles
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

-- Public (anon key, no session) can read only published articles. This is the one table the public
-- site queries directly rather than through a service-role route, since it's read-only and already
-- scoped to published=true.
create policy kb_articles_select_published_public on kb_articles
  for select using (published = true);

-- conversation_summaries ----------------------------------------------------------
create policy conversation_summaries_all_members on conversation_summaries
  for all using (
    exists (
      select 1 from conversations
      where conversations.id = conversation_summaries.conversation_id
        and is_workspace_member(conversations.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from conversations
      where conversations.id = conversation_summaries.conversation_id
        and is_workspace_member(conversations.workspace_id)
    )
  );
