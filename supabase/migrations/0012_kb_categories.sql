create table kb_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table kb_articles add column category_id uuid references kb_categories (id) on delete set null;

create index kb_articles_category_idx on kb_articles (category_id);

alter table kb_categories enable row level security;

create policy kb_categories_manage_members on kb_categories
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create policy kb_categories_select_public on kb_categories
  for select using (true);
