"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { broadcast } from "@/lib/realtime/broadcast";
import { workspaceChannelName } from "@/lib/realtime/channels";
import type { ConversationStatus } from "@/lib/types";

export interface ConversationActionResult {
  error?: string;
}

// Assignment and status are plain RLS-protected UPDATEs (conversations_all_members policy). The
// broadcast afterward is purely a UX signal so other agents' conversation lists update live — if it
// were missed, the next page load or filter change would show the correct state anyway from Postgres.
export async function assignConversation(
  conversationId: string,
  assigneeId: string | null,
): Promise<ConversationActionResult> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("conversations")
    .update({ assignee_id: assigneeId })
    .eq("id", conversationId)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  await broadcast(workspaceChannelName(context.workspace.id), "conversation_updated", {
    conversation_id: conversationId,
  });
  return {};
}

export async function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus,
): Promise<ConversationActionResult> {
  const context = await requireWorkspaceContext();
  const supabase = await createClient();

  const { error } = await supabase
    .from("conversations")
    .update({ status })
    .eq("id", conversationId)
    .eq("workspace_id", context.workspace.id);

  if (error) {
    return { error: error.message };
  }

  await broadcast(workspaceChannelName(context.workspace.id), "conversation_updated", {
    conversation_id: conversationId,
  });
  return {};
}
