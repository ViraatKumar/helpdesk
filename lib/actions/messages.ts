"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { broadcast } from "@/lib/realtime/broadcast";
import { conversationChannelName, workspaceChannelName } from "@/lib/realtime/channels";

export interface SendReplyResult {
  error?: string;
}

// Agent replies go through the user's own RLS-scoped session (messages_insert_agents policy), not
// the service role — this is a real agent acting in their own workspace, so there's no reason to
// bypass the trust boundary the way the anonymous widget routes have to.
export async function sendAgentReply(conversationId: string, body: string): Promise<SendReplyResult> {
  const context = await requireWorkspaceContext();
  if (!body.trim()) {
    return { error: "Message cannot be empty." };
  }

  const supabase = await createClient();
  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: context.userId,
      body: body.trim(),
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  await broadcast(conversationChannelName(conversationId), "new_message", { message });
  await broadcast(workspaceChannelName(context.workspace.id), "conversation_updated", {
    conversation_id: conversationId,
  });

  return {};
}

export async function notifyAgentTyping(conversationId: string): Promise<void> {
  await requireWorkspaceContext();
  await broadcast(conversationChannelName(conversationId), "typing", { from: "agent" });
}

// Read receipts: read_at is stamped when the agent's inbox pane has the conversation focused (called
// from a client-side effect on mount/focus), not on every poll — see component for the trigger.
export async function markConversationRead(conversationId: string): Promise<void> {
  await requireWorkspaceContext();
  const supabase = await createClient();

  const { data: unread } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("sender_type", "contact")
    .is("read_at", null)
    .select("id");

  if (unread && unread.length > 0) {
    await broadcast(conversationChannelName(conversationId), "read_receipt", {
      message_ids: unread.map((m) => m.id),
    });
  }
}
