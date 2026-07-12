"use server";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspaceContext } from "@/lib/auth/session";
import { broadcast } from "@/lib/realtime/broadcast";
import { conversationChannelName, workspaceChannelName } from "@/lib/realtime/channels";
import { sendReplyEmail } from "@/lib/email/send";
import { buildReplySubject, buildOutboundReferences } from "@/lib/email/threading";
import { escapeHtml } from "@/lib/utils";

export interface SendReplyResult {
  error?: string;
}

// Agent replies go through the user's own RLS-scoped session (messages_insert_agents policy), not
// the service role — this is a real agent acting in their own workspace, so there's no reason to
// bypass the trust boundary the way the anonymous widget routes have to. The conversation's channel
// decides the delivery mechanism (Resend vs. broadcast-only); the unified inbox composer is the same
// component either way — see components/inbox/reply-composer.tsx.
export async function sendAgentReply(
  conversationId: string,
  body: string,
  bodyHtml?: string,
): Promise<SendReplyResult> {
  const context = await requireWorkspaceContext();
  if (!body.trim()) {
    return { error: "Message cannot be empty." };
  }

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, contact:contacts(*)")
    .eq("id", conversationId)
    .single();

  if (!conversation) {
    return { error: "Conversation not found." };
  }

  let emailMessageId: string | null = null;
  let emailInReplyTo: string | null = null;

  if (conversation.channel === "email") {
    if (!conversation.contact?.email) {
      return { error: "This contact has no email address on file." };
    }

    const { data: priorMessages } = await supabase
      .from("messages")
      .select("email_message_id")
      .eq("conversation_id", conversationId)
      .not("email_message_id", "is", null)
      .order("created_at", { ascending: true });

    const priorIds = (priorMessages ?? [])
      .map((m) => m.email_message_id)
      .filter((id): id is string => Boolean(id));
    const { inReplyTo, references } = buildOutboundReferences(priorIds, priorIds.at(-1) ?? null);

    try {
      const sent = await sendReplyEmail({
        to: conversation.contact.email,
        subject: buildReplySubject(conversation.subject),
        html: bodyHtml || `<p>${escapeHtml(body)}</p>`,
        text: body,
        inReplyTo,
        references,
      });
      emailMessageId = sent.messageId;
      emailInReplyTo = inReplyTo;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to send email." };
    }
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "agent",
      sender_id: context.userId,
      body: body.trim(),
      body_html: bodyHtml ?? null,
      email_message_id: emailMessageId,
      email_in_reply_to: emailInReplyTo,
    })
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  // SLA: stamp the first-response time exactly once (the `.is null` filter makes this a no-op on
  // every reply after the first) — lib/sla.ts measures against it.
  await supabase
    .from("conversations")
    .update({ first_agent_reply_at: new Date().toISOString() })
    .eq("id", conversationId)
    .is("first_agent_reply_at", null);

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
