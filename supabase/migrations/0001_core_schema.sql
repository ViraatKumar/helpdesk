-- 0001_core_schema.sql
-- What: workspaces, membership, contacts, conversations, messages, kb_articles, conversation_summaries.
-- Why: a conversation is channel-agnostic; channel is metadata on the row, not a separate table per
-- channel. The unified inbox is a filtered query over `conversations`, never a UNION of chat/email
-- silos. This is the load-bearing decision for the whole project — get it right before anything else.

create extension if not exists "pgcrypto";

-- workspaces & membership -----------------------------------------------------

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'agent')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- end users (NOT agents) -------------------------------------------------------
-- Why a separate table: conflating support contacts with auth.users would force every widget visitor
-- through Supabase Auth signup, which defeats anonymous chat entirely.

create table contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  email text,
  name text,
  anonymous_id text,
  created_at timestamptz not null default now()
);

create index contacts_workspace_email_idx on contacts (workspace_id, email);
create index contacts_workspace_anonymous_idx on contacts (workspace_id, anonymous_id);

-- the spine ---------------------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  channel text not null check (channel in ('chat', 'email')),
  status text not null default 'open' check (status in ('open', 'closed', 'snoozed')),
  assignee_id uuid references auth.users (id) on delete set null,
  subject text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Serves the inbox's default sort (newest activity first) filtered by workspace + status.
create index conversations_workspace_status_activity_idx
  on conversations (workspace_id, status, last_message_at desc);

create index conversations_assignee_idx on conversations (assignee_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_type text not null check (sender_type in ('contact', 'agent')),
  sender_id uuid not null, -- contacts.id or auth.users.id depending on sender_type; no FK, see below
  body text not null,
  body_html text,
  email_message_id text,
  email_in_reply_to text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Why no FK on sender_id: it polymorphically references either contacts(id) or auth.users(id)
-- depending on sender_type. Postgres has no native polymorphic FK; enforcing this in a trigger would
-- add complexity for a value that is already validated at the server-route trust boundary.
create index messages_conversation_created_idx on messages (conversation_id, created_at);

-- Threading: inbound emails carry In-Reply-To/References headers that must resolve to a Message-ID
-- we've already seen, and idempotency (providers retry webhook delivery) needs a fast unique lookup.
create unique index messages_email_message_id_idx on messages (email_message_id)
  where email_message_id is not null;

-- knowledge base ------------------------------------------------------------------

create table kb_articles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  title text not null,
  body_html text not null default '',
  published boolean not null default false,
  search_vector tsvector generated always as
    (to_tsvector('english', title || ' ' || coalesce(body_html, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index kb_articles_search_idx on kb_articles using gin (search_vector);
create index kb_articles_workspace_published_idx on kb_articles (workspace_id, published);

-- AI cache -----------------------------------------------------------------------
-- Why keyed on generated_for_message_at rather than a TTL: correctness should track conversation
-- activity, not wall-clock time. A summary is stale exactly when a new message has arrived since it
-- was generated — never sooner, never later.

create table conversation_summaries (
  conversation_id uuid primary key references conversations (id) on delete cascade,
  summary jsonb not null,
  generated_for_message_at timestamptz not null,
  created_at timestamptz not null default now()
);
