import "server-only";
import * as nodemailer from "nodemailer";

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

// Generates and owns our own Message-ID rather than trusting whatever the SMTP provider returns, so it's known
// before the send call completes and can be stored on the message row atomically with the insert —
// no follow-up write, no window where a sent email has no Message-ID on our side yet.
function generateMessageId(): string {
  const domain = new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname;
  return `<${crypto.randomUUID()}@${domain}>`;
}

export async function sendReplyEmail(params: SendReplyEmailParams): Promise<SendReplyEmailResult> {
  const messageId = generateMessageId();
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error("SMTP credentials are not fully configured in environment variables.");
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const headers: Record<string, string> = { "Message-ID": messageId };
  if (params.inReplyTo) headers["In-Reply-To"] = params.inReplyTo;
  if (params.references.length > 0) headers["References"] = params.references.join(" ");

  // Ensure Reply-To is set to the inbound webhooks address
  const replyToAddress = process.env.INBOUND_EMAIL_ADDRESS!;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER, // Must match authenticated user for most SMTP relays like Gmail
      to: params.to,
      replyTo: replyToAddress,
      subject: params.subject,
      html: params.html,
      text: params.text,
      headers,
    });
  } catch (error: any) {
    throw new Error(`SMTP send failed: ${error.message}`);
  }

  return { messageId };
}
