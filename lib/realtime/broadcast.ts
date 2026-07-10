import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// Server-side broadcast: message inserts flow through a server route (service role) → Postgres →
// realtime broadcast. Broadcast rather than postgres_changes deliberately — see README trade-off
// ledger. postgres_changes would require RLS SELECT policies that let anonymous widget visitors read
// the messages table directly, which (since RLS is row-based, not capability-based) would mean any
// visitor could list every workspace's chat history, not just their own conversation. Broadcast
// channels are scoped by name (the conversation UUID) instead: knowing the id is the capability,
// same trust model as a shareable support link.
export async function broadcast(
  channelName: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const channel = supabase.channel(channelName);
  await channel.send({ type: "broadcast", event, payload });
  await supabase.removeChannel(channel);
}
