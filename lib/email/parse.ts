import { z } from "zod";
import type { InboundEmailHeaders } from "@/lib/email/threading";

// Resend's inbound webhook payload shape. The `type` check matters: a Resend webhook endpoint can be
// subscribed to any of ~17 event types (email.sent, email.delivered, email.bounced, ...), and several
// of those outbound-delivery events carry a `data.from` field too. Without pinning `type` to exactly
// "email.received", a delivery receipt for an email *we* sent could be misread as a customer message
// arriving. Field names below are kept intentionally loose (raw headers array preferred, top-level
// fields as fallback) since this was built without a live Resend account to fire a real webhook
// against and confirm every field — see README trade-off ledger.
const headerEntrySchema = z.object({ name: z.string(), value: z.string() });

const resendInboundSchema = z.object({
  type: z.literal("email.received"),
  data: z.object({
    from: z.string(),
    to: z.union([z.string(), z.array(z.string())]).optional(),
    subject: z.string().optional(),
    text: z.string().optional(),
    html: z.string().optional(),
    created_at: z.string().optional(),
    message_id: z.string().optional(),
    headers: z.union([z.array(headerEntrySchema), z.record(z.string(), z.string())]).optional(),
  }),
});

export interface ParsedInboundEmail {
  headers: InboundEmailHeaders;
  toAddress: string;
  text: string;
  html: string | null;
}

function lookupHeader(
  headers: z.infer<typeof headerEntrySchema>[] | Record<string, string> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (Array.isArray(headers)) {
    const entry = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return entry?.value ?? null;
  }
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

export function parseInboundEmail(rawBody: unknown): ParsedInboundEmail | null {
  const parsed = resendInboundSchema.safeParse(rawBody);
  if (!parsed.success) return null;

  const { data } = parsed.data;
  const messageId = lookupHeader(data.headers, "Message-ID") ?? data.message_id;
  if (!messageId) return null;

  const toAddress = Array.isArray(data.to) ? data.to[0] : data.to;
  if (!toAddress) return null;

  return {
    toAddress,
    text: data.text ?? "",
    html: data.html ?? null,
    headers: {
      messageId,
      inReplyTo: lookupHeader(data.headers, "In-Reply-To"),
      references: parseReferences(lookupHeader(data.headers, "References")),
      fromEmail: extractSenderEmail(data.from),
      subject: data.subject ?? "(no subject)",
      date: data.created_at ?? new Date().toISOString(),
    },
  };
}
