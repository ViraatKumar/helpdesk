import "server-only";
import { Resend } from "resend";

export interface SendReplyEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  inReplyTo: string | null;
  references: string[];
}

export interface SendReplyEmailResult {
  messageId: string;
}

// Generates and owns our own Message-ID rather than trusting whatever Resend returns, so it's known
// before the send call completes and can be stored on the message row atomically with the insert —
// no follow-up write, no window where a sent email has no Message-ID on our side yet.
function generateMessageId(): string {
  const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;
  return `<${crypto.randomUUID()}@${domain}>`;
}

export async function sendReplyEmail(params: SendReplyEmailParams): Promise<SendReplyEmailResult> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const messageId = generateMessageId();

  const headers: Record<string, string> = { "Message-ID": messageId };
  if (params.inReplyTo) headers["In-Reply-To"] = params.inReplyTo;
  if (params.references.length > 0) headers["References"] = params.references.join(" ");

  const { error } = await resend.emails.send({
    from: process.env.INBOUND_EMAIL_ADDRESS!,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  return { messageId };
}
