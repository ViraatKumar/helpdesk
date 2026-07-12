import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { broadcast } from "@/lib/realtime/broadcast";
import { conversationChannelName, workspaceChannelName } from "@/lib/realtime/channels";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
  body: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { conversationId, contactId, body } = parsed.data;

  const supabase = createServiceClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact_id, workspace_id, status")
    .eq("id", conversationId)
    .maybeSingle();

  // why: contactId is client-supplied (from localStorage), so it's only trusted once we've confirmed
  // it actually owns this conversation — otherwise anyone who guessed a conversation UUID could post
  // into someone else's thread.
  if (!conversation || conversation.contact_id !== contactId) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { count: messageCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", conversationId);

  if (messageCount !== null && messageCount >= 10) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Maximum messages per conversation reached." },
      { status: 429 }
    );
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_type: "contact", sender_id: contactId, body })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // A reply reopens a closed/snoozed thread — the visitor is back, so it belongs in the active queue.
  if (conversation.status !== "open") {
    await supabase.from("conversations").update({ status: "open" }).eq("id", conversationId);
  }

  await broadcast(conversationChannelName(conversationId), "new_message", { message });
  await broadcast(workspaceChannelName(conversation.workspace_id), "conversation_updated", {
    conversation_id: conversationId,
  });

  // Fire webhook in background
  dispatchWebhookEvent(conversation.workspace_id, "message.created", message);

  return NextResponse.json({ message });
}
