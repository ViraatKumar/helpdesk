import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiWorkspaceContext } from "@/lib/auth/api-session";
import { generateReplyDraft } from "@/lib/ai/draft-reply";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiWorkspaceContext();
  if ("error" in auth) return auth.error;

  const { id: conversationId } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("workspace_id", auth.context.workspace.id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const [{ data: messages }, { data: articles }] = await Promise.all([
    supabase
      .from("messages")
      .select("sender_type, body")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("kb_articles")
      .select("title")
      .eq("workspace_id", auth.context.workspace.id)
      .eq("published", true),
  ]);

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "Nothing to draft a reply for yet." }, { status: 400 });
  }

  try {
    const draft = await generateReplyDraft(
      messages,
      (articles ?? []).map((a) => a.title),
    );
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[conversations/draft-reply] generation failed", err);
    return NextResponse.json({ error: "Couldn't generate a draft right now." }, { status: 502 });
  }
}
