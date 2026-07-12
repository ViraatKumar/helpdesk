create table api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  prefix text not null,
  created_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone
);

create index api_keys_workspace_idx on api_keys (workspace_id);
create index api_keys_key_hash_idx on api_keys (key_hash);

create table webhooks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  url text not null,
  secret text not null,
  events text[] not null default '{}',
  active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

create index webhooks_workspace_idx on webhooks (workspace_id);

alter table api_keys enable row level security;
alter table webhooks enable row level security;

create policy api_keys_all_members
  on api_keys for all
  to authenticated
  using (is_workspace_member(workspace_id));

create policy webhooks_all_members
  on webhooks for all
  to authenticated
  using (is_workspace_member(workspace_id));
