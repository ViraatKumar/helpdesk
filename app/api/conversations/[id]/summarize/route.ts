import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiWorkspaceContext } from "@/lib/auth/api-session";
import { generateConversationSummary } from "@/lib/ai/summarize";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiWorkspaceContext();
  if ("error" in auth) return auth.error;

  const { id: conversationId } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, last_message_at")
    .eq("id", conversationId)
    .eq("workspace_id", auth.context.workspace.id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const { data: cached } = await supabase
    .from("conversation_summaries")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  // why generated_for_message_at, not a TTL: a summary is stale exactly when a new message has
  // arrived since it was generated — never sooner (wasted API cost), never later (stale summary
  // shown as current). See migration 0001 and README trade-off ledger.
  if (cached && cached.generated_for_message_at === conversation.last_message_at) {
    return NextResponse.json({ summary: cached.summary, cached: true });
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("sender_type, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Nothing to summarize yet." }, { status: 400 });
  }

  try {
    const summary = await generateConversationSummary(messages);

    await supabase.from("conversation_summaries").upsert({
      conversation_id: conversationId,
      summary,
      generated_for_message_at: conversation.last_message_at,
    });

    return NextResponse.json({ summary, cached: false });
  } catch (err) {
    // why 200-adjacent handling doesn't apply here (unlike the email webhook): this is a
    // user-initiated fetch, not a provider retry loop. A clear error status lets the UI show a toast
    // and let the agent retry, rather than silently doing nothing.
    console.error("[conversations/summarize] generation failed", err);
    return NextResponse.json({ error: "Couldn't generate a summary right now." }, { status: 502 });
  }
}
