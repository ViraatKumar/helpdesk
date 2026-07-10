-- 0002_last_message_at_trigger.sql
-- What: a trigger that stamps conversations.last_message_at on every message insert.
-- Why: this must be correct regardless of which ingestion path wrote the message (widget realtime
-- route, inbound email webhook, dashboard reply). Putting it in application code means every new
-- ingestion path has to remember to update it; a trigger makes it structurally impossible to forget.

create function set_conversation_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_set_last_message_at
  after insert on messages
  for each row
  execute function set_conversation_last_message_at();
