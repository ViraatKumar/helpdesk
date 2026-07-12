import { createHmac, timingSafeEqual } from "node:crypto";

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function buildWebhookSignatureHeaders(secret: string, body: string, date: Date): Record<string, string> {
  const timestamp = Math.floor(date.getTime() / 1000).toString();
  const signature = signWebhookPayload(secret, timestamp, body);
  return {
    "x-helpdesk-timestamp": timestamp,
    "x-helpdesk-signature": `v1=${signature}`,
  };
}

export interface VerifyWebhookSignatureArgs {
  secret: string;
  body: string;
  timestamp: string;
  signature: string;
}

export function verifyWebhookSignature({ secret, body, timestamp, signature }: VerifyWebhookSignatureArgs): boolean {
  if (!signature.startsWith("v1=")) return false;
  
  const expectedSignature = signWebhookPayload(secret, timestamp, body);
  const providedSignature = signature.slice(3); // remove 'v1='

  if (expectedSignature.length !== providedSignature.length) return false;

  return timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature)
  );
}
