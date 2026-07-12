import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({
  workspaceSlug: z.string().min(1),
  anonymousId: z.string().min(1),
});

// Anonymous widget visitors have no Supabase Auth session, so this route (like every /api/widget/*
// route) runs on the service role and re-derives everything from the request body rather than
// trusting a client-passed contact/conversation id blindly for anything beyond a lookup key.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { workspaceSlug, anonymousId } = parsed.data;

  const supabase = createServiceClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .maybeSingle();

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("anonymous_id", anonymousId)
    .maybeSingle();

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({ workspace_id: workspace.id, anonymous_id: anonymousId })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    contact = newContact;
  }

  // why "open" only: a closed chat conversation is done; a new visit (or message) after closure
  // starts a fresh thread rather than reopening old context, mirroring how Intercom starts a new
  // conversation once the previous one is resolved.
  let { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .eq("channel", "chat")
    .eq("status", "open")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { count: conversationCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", contact.id);

    if (conversationCount !== null && conversationCount >= 10) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum conversations per contact reached." },
        { status: 429 }
      );
    }

    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({ workspace_id: workspace.id, contact_id: contact.id, channel: "chat" })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    conversation = newConversation;
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    contactId: contact.id,
    contactEmail: contact.email,
    conversationId: conversation.id,
    messages: messages ?? [],
  });
}
