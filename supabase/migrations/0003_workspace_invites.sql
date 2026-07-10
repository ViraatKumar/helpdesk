-- 0003_workspace_invites.sql
-- What: pending-member rows keyed by email, auto-linked to a real membership on that email's signup.
-- Why: full invitation emails are a named descope (see README trade-off ledger) — this is the
-- smallest thing that lets an owner pre-authorize a teammate's role before that teammate exists.

create table workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'agent')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

-- On signup, we check this table for the new user's email and materialize a workspace_members row.
-- See 0005_workspace_signup.sql for the linking function.
create index workspace_invites_email_idx on workspace_invites (email);
