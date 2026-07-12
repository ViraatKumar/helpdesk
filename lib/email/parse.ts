import { z } from "zod";
import type { InboundEmailHeaders } from "@/lib/email/threading";

// Resend's inbound flow is two-step: the `email.received` webhook carries only envelope metadata
// (email_id, from, to, subject, message_id — no body, no threading headers), and the actual
// content lives behind GET /emails/receiving/{id} (lib/email/receive.ts). The `type` pin matters:
// a Resend webhook endpoint can be subscribed to any of ~17 event types (email.sent,
// email.delivered, email.bounced, ...), and several of those outbound-delivery events carry a
// `data.from` field too. Without pinning `type` to exactly "email.received", a delivery receipt
// for an email *we* sent could be misread as a customer message arriving.
const resendInboundSchema = z.object({
  type: z.literal("email.received"),
  data: z.object({
    email_id: z.string(),
    from: z.string(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
    received_for: z.array(z.string()).optional(),
    subject: z.string().optional(),
    created_at: z.string().optional(),
    message_id: z.string().optional(),
  }),
});

/** Envelope metadata from the webhook itself — everything except the body/headers. */
export interface InboundWebhookEnvelope {
  emailId: string;
  fromField: string;
  toAddress: string;
  subject: string | null;
  messageId: string | null;
  createdAt: string | null;
}

/** Body + raw headers fetched from GET /emails/receiving/{id} — see lib/email/receive.ts. */
export interface ReceivedEmailContent {
  text: string | null;
  html: string | null;
  headers: Record<string, string> | null;
  messageId: string | null;
}

export interface ParsedInboundEmail {
  headers: InboundEmailHeaders;
  toAddress: string;
  text: string;
  html: string | null;
}

function lookupHeader(headers: Record<string, string> | null, name: string): string | null {
  if (!headers) return null;
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

// References is a whitespace-separated list of angle-bracketed Message-IDs (RFC 5322 §3.6.4).
function parseReferences(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

function extractSenderEmail(fromField: string): string {
  // "Name <email@domain.com>" or a bare "email@domain.com".
  const match = fromField.match(/<([^>]+)>/);
  return (match ? match[1] : fromField).trim().toLowerCase();
}

// Fallback for HTML-only emails so the inbox (which renders message.body as plain text) never
// shows an empty bubble. Deliberately crude — this is a readable preview, not a fidelity
// conversion; the original markup is preserved in body_html.
function deriveTextFromHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function parseInboundWebhook(rawBody: unknown): InboundWebhookEnvelope | null {
  const parsed = resendInboundSchema.safeParse(rawBody);
  if (!parsed.success) return null;

  const { data } = parsed.data;
  // received_for is the envelope recipient — the address the email was actually delivered to —
  // which is what plus-addressed workspace routing needs (the To: header can differ, e.g. BCC).
  const toAddress = data.received_for?.[0] ?? (Array.isArray(data.to) ? data.to[0] : data.to);
  if (!toAddress) return null;

  return {
    emailId: data.email_id,
    fromField: data.from,
    toAddress,
    subject: data.subject ?? null,
    messageId: data.message_id ?? null,
    createdAt: data.created_at ?? null,
  };
}

export function buildInboundEmail(
  envelope: InboundWebhookEnvelope,
  content: ReceivedEmailContent,
): ParsedInboundEmail | null {
  const messageId =
    lookupHeader(content.headers, "Message-ID") ?? content.messageId ?? envelope.messageId;
  if (!messageId) return null;

  const text = content.text?.trim() ? content.text : deriveTextFromHtml(content.html);

  return {
    toAddress: envelope.toAddress,
    text,
    html: content.html,
    headers: {
      messageId,
      inReplyTo: lookupHeader(content.headers, "In-Reply-To"),
      references: parseReferences(lookupHeader(content.headers, "References")),
      fromEmail: extractSenderEmail(envelope.fromField),
      subject: envelope.subject ?? "(no subject)",
      date: envelope.createdAt ?? new Date().toISOString(),
    },
  };
}
