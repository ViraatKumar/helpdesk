import "server-only";
import crypto from "node:crypto";

// Resend signs inbound webhooks using the Svix format: HMAC-SHA256 over "{id}.{timestamp}.{body}",
// base64-encoded, compared against one or more "v1,<sig>" entries in svix-signature (multiple
// entries support secret rotation — we accept a match against any of them).
export function verifyResendWebhookSignature(params: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
}): boolean {
  const secretBytes = Buffer.from(params.secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${params.svixId}.${params.svixTimestamp}.${params.payload}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuffer = Buffer.from(expected, "base64");

  return params.svixSignature
    .split(" ")
    .map((entry) => entry.split(",")[1])
    .filter((sig): sig is string => Boolean(sig))
    .some((sig) => {
      const provided = Buffer.from(sig, "base64");
      return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
    });
}
