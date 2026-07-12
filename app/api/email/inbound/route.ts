import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyResendWebhookSignature } from "@/lib/email/verify-webhook";
import { parseInboundWebhook, buildInboundEmail, type ReceivedEmailContent } from "@/lib/email/parse";
import { fetchReceivedEmailContent } from "@/lib/email/receive";
import {
  matchInboundEmailToConversation,
  resolveWorkspaceSlugFromRecipient,
  type RecentConversationCandidate,
} from "@/lib/email/threading";
import { broadcast } from "@/lib/realtime/broadcast";
import { conversationChannelName, workspaceChannelName } from "@/lib/realtime/channels";

const UNIQUE_VIOLATION = "23505";

// why every non-retryable failure returns 200: email providers retry webhook deliveries on any
// non-2xx response. A malformed payload or an email whose workspace we can't resolve will never
// succeed on retry — returning 4xx/5xx here just produces a retry storm of the same failure. We log
// and return 200 for those. The two exceptions that DO return non-200: signature verification (a
// real security boundary) and a failed content fetch from Resend's API (transient — a retry can
// succeed, and the email_message_id unique index makes redelivery idempotent).
export async function POST(request: Request) {
  const rawBody = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 401 });
  }

  const validSignature = verifyResendWebhookSignature({
    payload: rawBody,
    svixId,
    svixTimestamp,
    svixSignature,
    secret: process.env.RESEND_WEBHOOK_SECRET!,
  });
  if (!validSignature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const parsedBody = JSON.parse(rawBody);
  const envelope = parseInboundWebhook(parsedBody);
  if (!envelope) {
    console.error("[email/inbound] unrecognized payload shape", parsedBody);
    return NextResponse.json({ ok: true });
  }

  // The webhook payload has no body or threading headers — fetch them from Resend's API.
  let content: ReceivedEmailContent;
  try {
    content = await fetchReceivedEmailContent(envelope.emailId);
  } catch (err) {
    console.error("[email/inbound] failed to fetch email content", err);
    return NextResponse.json({ error: "Failed to fetch email content." }, { status: 502 });
  }

  const email = buildInboundEmail(envelope, content);
  if (!email) {
    console.error("[email/inbound] email has no Message-ID", envelope.emailId);
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const workspaceSlug = resolveWorkspaceSlugFromRecipient(email.toAddress);
  const workspaceQuery = supabase.from("workspaces").select("id").limit(1);
  const { data: workspace } = await (workspaceSlug
    ? workspaceQuery.eq("slug", workspaceSlug)
    : workspaceQuery.order("created_at", { ascending: true })
  ).maybeSingle();

  if (!workspace) {
    console.error("[email/inbound] no workspace found for recipient", email.toAddress);
    return NextResponse.json({ ok: true });
  }

  let { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("workspace_id", workspace.id)
    .eq("email", email.headers.fromEmail)
    .maybeSingle();

  if (!contact) {
    const { data: newContact, error } = await supabase
      .from("contacts")
      .insert({ workspace_id: workspace.id, email: email.headers.fromEmail })
      .select("*")
      .single();
    if (error) {
      console.error("[email/inbound] failed to create contact", error);
      return NextResponse.json({ ok: true });
    }
    contact = newContact;
  }

  const referencedIds = [email.headers.inReplyTo, ...email.headers.references].filter(
    (id): id is string => Boolean(id),
  );
  const messageIdToConversationId = new Map<string, string>();
  if (referencedIds.length > 0) {
    const { data: knownMessages } = await supabase
      .from("messages")
      .select("email_message_id, conversation_id")
      .in("email_message_id", referencedIds);
    for (const m of knownMessages ?? []) {
      if (m.email_message_id) messageIdToConversationId.set(m.email_message_id, m.conversation_id);
    }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentConversationRows } = await supabase
    .from("conversations")
    .select("id, subject, created_at")
    .eq("contact_id", contact.id)
    .eq("channel", "email")
    .gte("created_at", thirtyDaysAgo);

  const recentConversations: RecentConversationCandidate[] = (recentConversationRows ?? []).map((c) => ({
    conversationId: c.id,
    contactEmail: email.headers.fromEmail,
    subject: c.subject,
    createdAt: c.created_at,
  }));

  const match = matchInboundEmailToConversation(
    email.headers,
    messageIdToConversationId,
    recentConversations,
    new Date(),
  );

  let conversationId: string;
  if ("conversationId" in match) {
    conversationId = match.conversationId;
    await supabase
      .from("conversations")
      .update({ status: "open" })
      .eq("id", conversationId)
      .neq("status", "open");
  } else {
    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({
        workspace_id: workspace.id,
        contact_id: contact.id,
        channel: "email",
        subject: email.headers.subject,
      })
      .select("id")
      .single();
    if (error) {
      console.error("[email/inbound] failed to create conversation", error);
      return NextResponse.json({ ok: true });
    }
    conversationId = newConversation.id;
  }

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_type: "contact",
      sender_id: contact.id,
      body: email.text,
      body_html: email.html,
      email_message_id: email.headers.messageId,
      email_in_reply_to: email.headers.inReplyTo,
    })
    .select("*")
    .single();

  if (insertError) {
    // Idempotency: Resend retries webhook deliveries, and this unique index (migration 0001) is what
    // makes a retry a no-op instead of a duplicate message.
    if (insertError.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[email/inbound] failed to insert message", insertError);
    return NextResponse.json({ ok: true });
  }

  await broadcast(conversationChannelName(conversationId), "new_message", { message });
  await broadcast(workspaceChannelName(workspace.id), "conversation_updated", {
    conversation_id: conversationId,
  });

  return NextResponse.json({ ok: true });
}
