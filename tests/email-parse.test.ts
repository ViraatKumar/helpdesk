import { describe, it, expect } from "vitest";
import {
  parseInboundWebhook,
  buildInboundEmail,
  type InboundWebhookEnvelope,
  type ReceivedEmailContent,
} from "@/lib/email/parse";

function webhookPayload(dataOverrides: Record<string, unknown> = {}, type = "email.received") {
  return {
    type,
    data: {
      email_id: "re_abc123",
      from: "Jane Customer <jane@example.com>",
      to: ["support@helpdesk.dev"],
      received_for: ["support+acme@helpdesk.dev"],
      subject: "Help with my order",
      created_at: "2026-07-12T10:00:00.000Z",
      message_id: "<orig@customer.com>",
      ...dataOverrides,
    },
  };
}

function envelope(overrides: Partial<InboundWebhookEnvelope> = {}): InboundWebhookEnvelope {
  return {
    emailId: "re_abc123",
    fromField: "Jane Customer <jane@example.com>",
    toAddress: "support+acme@helpdesk.dev",
    subject: "Help with my order",
    messageId: "<envelope@customer.com>",
    createdAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

function content(overrides: Partial<ReceivedEmailContent> = {}): ReceivedEmailContent {
  return {
    text: "Hello, my order is late.",
    html: "<p>Hello, my order is late.</p>",
    headers: { "Message-ID": "<orig@customer.com>" },
    messageId: "<api@customer.com>",
    ...overrides,
  };
}

describe("parseInboundWebhook", () => {
  it("parses a valid email.received payload into an envelope", () => {
    expect(parseInboundWebhook(webhookPayload())).toEqual({
      emailId: "re_abc123",
      fromField: "Jane Customer <jane@example.com>",
      toAddress: "support+acme@helpdesk.dev",
      subject: "Help with my order",
      messageId: "<orig@customer.com>",
      createdAt: "2026-07-12T10:00:00.000Z",
    });
  });

  it("rejects any other event type, even ones that carry data.from", () => {
    expect(parseInboundWebhook(webhookPayload({}, "email.delivered"))).toBeNull();
    expect(parseInboundWebhook(webhookPayload({}, "email.bounced"))).toBeNull();
  });

  it("prefers received_for (envelope recipient) over the To header for routing", () => {
    const result = parseInboundWebhook(
      webhookPayload({ to: ["someone-else@corp.com"], received_for: ["support+acme@helpdesk.dev"] }),
    );
    expect(result?.toAddress).toBe("support+acme@helpdesk.dev");
  });

  it("falls back to the To field (array or string) when received_for is absent", () => {
    expect(parseInboundWebhook(webhookPayload({ received_for: undefined }))?.toAddress).toBe(
      "support@helpdesk.dev",
    );
    expect(
      parseInboundWebhook(webhookPayload({ received_for: undefined, to: "solo@helpdesk.dev" }))
        ?.toAddress,
    ).toBe("solo@helpdesk.dev");
  });

  it("returns null when there is no recipient at all", () => {
    expect(parseInboundWebhook(webhookPayload({ received_for: undefined, to: undefined }))).toBeNull();
  });

  it("returns null when email_id is missing (content would be unfetchable)", () => {
    expect(parseInboundWebhook(webhookPayload({ email_id: undefined }))).toBeNull();
  });
});

describe("buildInboundEmail", () => {
  it("merges envelope and content into a parsed email", () => {
    const result = buildInboundEmail(envelope(), content());
    expect(result).toEqual({
      toAddress: "support+acme@helpdesk.dev",
      text: "Hello, my order is late.",
      html: "<p>Hello, my order is late.</p>",
      headers: {
        messageId: "<orig@customer.com>",
        inReplyTo: null,
        references: [],
        fromEmail: "jane@example.com",
        subject: "Help with my order",
        date: "2026-07-12T10:00:00.000Z",
      },
    });
  });

  it("reads threading headers case-insensitively", () => {
    const result = buildInboundEmail(
      envelope(),
      content({
        headers: {
          "message-id": "<msg@customer.com>",
          "in-reply-to": "<parent@helpdesk.dev>",
          references: "<a@helpdesk.dev> <parent@helpdesk.dev>",
        },
      }),
    );
    expect(result?.headers.messageId).toBe("<msg@customer.com>");
    expect(result?.headers.inReplyTo).toBe("<parent@helpdesk.dev>");
    expect(result?.headers.references).toEqual(["<a@helpdesk.dev>", "<parent@helpdesk.dev>"]);
  });

  it("falls back through content message_id then envelope message_id", () => {
    expect(buildInboundEmail(envelope(), content({ headers: null }))?.headers.messageId).toBe(
      "<api@customer.com>",
    );
    expect(
      buildInboundEmail(envelope(), content({ headers: null, messageId: null }))?.headers.messageId,
    ).toBe("<envelope@customer.com>");
  });

  it("returns null when no Message-ID exists anywhere", () => {
    expect(
      buildInboundEmail(envelope({ messageId: null }), content({ headers: null, messageId: null })),
    ).toBeNull();
  });

  it("derives plain text from HTML when the text part is missing or blank", () => {
    const html = "<div><p>Hi &amp; hello</p><style>p{color:red}</style><p>Second line</p></div>";
    expect(buildInboundEmail(envelope(), content({ text: null, html }))?.text).toBe(
      "Hi & hello\nSecond line",
    );
    expect(buildInboundEmail(envelope(), content({ text: "   ", html }))?.text).toBe(
      "Hi & hello\nSecond line",
    );
  });

  it("stores an empty body only when the email genuinely has no content", () => {
    const result = buildInboundEmail(envelope(), content({ text: null, html: null }));
    expect(result?.text).toBe("");
    expect(result?.html).toBeNull();
  });

  it("extracts a bare sender address and defaults subject/date", () => {
    const result = buildInboundEmail(
      envelope({ fromField: "JANE@EXAMPLE.COM", subject: null, createdAt: null }),
      content(),
    );
    expect(result?.headers.fromEmail).toBe("jane@example.com");
    expect(result?.headers.subject).toBe("(no subject)");
    expect(result?.headers.date).toBeTruthy();
  });
});
