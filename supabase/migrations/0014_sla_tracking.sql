-- 0014_sla_tracking.sql
-- What: per-workspace SLA targets + the two conversation timestamps they're measured against.
-- The timestamps are stamped on write paths (agent reply / status change); lib/sla.ts interprets
-- them. Kept as plain columns, not events, because the SLA questions are point lookups
-- ("when was the first agent reply?"), never a history walk.

alter table conversations add column first_agent_reply_at timestamptz;
alter table conversations add column closed_at timestamptz;

-- Backfill first response from existing agent messages.
update conversations c
set first_agent_reply_at = sub.first_reply
from (
  select conversation_id, min(created_at) as first_reply
  from messages
  where sender_type = 'agent'
  group by conversation_id
) sub
where sub.conversation_id = c.id;

-- Best-available approximation for conversations closed before this column existed: the close
-- happened no earlier than the last message.
update conversations
set closed_at = last_message_at
where status = 'closed' and closed_at is null;

create table sla_policies (
  workspace_id uuid primary key references workspaces (id) on delete cascade,
  first_response_minutes integer check (first_response_minutes > 0),
  resolution_minutes integer check (resolution_minutes > 0),
  updated_at timestamptz not null default now()
);

alter table sla_policies enable row level security;

create policy sla_policies_select_members on sla_policies
  for select using (is_workspace_member(workspace_id));

create policy sla_policies_manage_admin on sla_policies
  for all using (is_workspace_member(workspace_id, 'admin'))
  with check (is_workspace_member(workspace_id, 'admin'));
