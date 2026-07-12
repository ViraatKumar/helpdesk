import "server-only";
import { Resend } from "resend";
import type { ReceivedEmailContent } from "@/lib/email/parse";

// The email.received webhook only carries envelope metadata — the body and threading headers live
// behind GET /emails/receiving/{id}. This throws on failure rather than returning a partial email:
// unlike a malformed payload, a failed content fetch is transient and *should* be retried, so the
// route maps it to a non-2xx response (Resend re-delivers the webhook) instead of swallowing it.
export async function fetchReceivedEmailContent(emailId: string): Promise<ReceivedEmailContent> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.receiving.get(emailId);

  if (error || !data) {
    throw new Error(`Resend receiving.get failed for ${emailId}: ${error?.message ?? "no data"}`);
  }

  return {
    text: data.text,
    html: data.html,
    headers: data.headers,
    messageId: data.message_id ?? null,
  };
}
