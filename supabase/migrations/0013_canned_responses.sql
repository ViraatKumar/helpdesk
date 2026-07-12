-- 0013_canned_responses.sql
-- What: reusable reply snippets per workspace, surfaced in the agent composer picker.
-- Shortcut is the muscle-memory handle ("/refund"); unique per workspace so the picker's
-- prefix match is deterministic.

create table canned_responses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  shortcut text not null,
  title text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, shortcut)
);

create index canned_responses_workspace_idx on canned_responses (workspace_id);

alter table canned_responses enable row level security;

-- All members read and write: agents author snippets for themselves and the team, matching how
-- Intercom/Front treat saved replies. Workspace isolation is the boundary that matters.
create policy canned_responses_all_members on canned_responses
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
