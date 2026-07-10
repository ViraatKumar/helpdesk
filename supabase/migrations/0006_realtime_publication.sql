-- 0006_realtime_publication.sql
-- What: add messages and conversations to the supabase_realtime publication.
-- Why: the widget subscribes to per-conversation message inserts, and the inbox subscribes to
-- workspace-level conversation updates (assignment, status changes). Both are plain Postgres change
-- feeds — no hand-rolled WebSocket server, per the stack decision in the README.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
