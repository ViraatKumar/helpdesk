import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { broadcast } from "@/lib/realtime/broadcast";
import { conversationChannelName } from "@/lib/realtime/channels";

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  contactId: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { conversationId, contactId } = parsed.data;

  const supabase = createServiceClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, contact_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation || conversation.contact_id !== contactId) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { data: unread } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("sender_type", "agent")
    .is("read_at", null)
    .select("id");

  if (unread && unread.length > 0) {
    await broadcast(conversationChannelName(conversationId), "read_receipt", {
      message_ids: unread.map((m) => m.id),
    });
  }

  return NextResponse.json({ success: true });
}
