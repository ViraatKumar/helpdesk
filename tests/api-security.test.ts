import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey } from "@/lib/api/keys";
import {
  signWebhookPayload,
  buildWebhookSignatureHeaders,
  verifyWebhookSignature,
} from "@/lib/webhooks/sign";

describe("generateApiKey", () => {
  it("produces a hd_-prefixed token with 40 hex chars of entropy", () => {
    const { token } = generateApiKey();
    expect(token).toMatch(/^hd_[a-f0-9]{40}$/);
  });

  it("returns a display prefix that is the start of the token", () => {
    const { token, prefix } = generateApiKey();
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length);
  });

  it("returns the sha256 hash of the token, matching hashApiKey", () => {
    const { token, hash } = generateApiKey();
    expect(hash).toBe(hashApiKey(token));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token.slice(3));
  });

  it("never generates the same token twice", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateApiKey().token));
    expect(tokens.size).toBe(50);
  });
});

describe("webhook signing", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({ type: "message.created", data: { id: "m1" } });

  it("signs deterministically for the same secret, timestamp, and body", () => {
    expect(signWebhookPayload(secret, "1700000000", body)).toBe(
      signWebhookPayload(secret, "1700000000", body),
    );
  });

  it("changes the signature when the secret, timestamp, or body changes", () => {
    const base = signWebhookPayload(secret, "1700000000", body);
    expect(signWebhookPayload("other", "1700000000", body)).not.toBe(base);
    expect(signWebhookPayload(secret, "1700000001", body)).not.toBe(base);
    expect(signWebhookPayload(secret, "1700000000", body + " ")).not.toBe(base);
  });

  it("builds v1-prefixed headers that verify round-trip", () => {
    const headers = buildWebhookSignatureHeaders(secret, body, new Date(1700000000000));
    expect(headers["x-helpdesk-timestamp"]).toBe("1700000000");
    expect(headers["x-helpdesk-signature"]).toMatch(/^v1=[a-f0-9]{64}$/);
    expect(
      verifyWebhookSignature({
        secret,
        body,
        timestamp: headers["x-helpdesk-timestamp"],
        signature: headers["x-helpdesk-signature"],
      }),
    ).toBe(true);
  });

  it("rejects a tampered body or wrong secret on verification", () => {
    const headers = buildWebhookSignatureHeaders(secret, body, new Date(1700000000000));
    expect(
      verifyWebhookSignature({
        secret,
        body: body.replace("m1", "m2"),
        timestamp: headers["x-helpdesk-timestamp"],
        signature: headers["x-helpdesk-signature"],
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret: "wrong",
        body,
        timestamp: headers["x-helpdesk-timestamp"],
        signature: headers["x-helpdesk-signature"],
      }),
    ).toBe(false);
  });
});
