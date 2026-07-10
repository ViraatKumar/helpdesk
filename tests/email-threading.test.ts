import { describe, it, expect } from "vitest";
import {
  matchInboundEmailToConversation,
  stripSubjectPrefixes,
  buildReplySubject,
  resolveWorkspaceSlugFromRecipient,
  buildOutboundReferences,
  type InboundEmailHeaders,
  type RecentConversationCandidate,
} from "@/lib/email/threading";

function headers(overrides: Partial<InboundEmailHeaders> = {}): InboundEmailHeaders {
  return {
    messageId: "<msg-1@customer.com>",
    inReplyTo: null,
    references: [],
    fromEmail: "customer@example.com",
    subject: "Help with my order",
    date: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("stripSubjectPrefixes", () => {
  it("strips a single Re: prefix", () => {
    expect(stripSubjectPrefixes("Re: hello")).toBe("hello");
  });

  it("strips chained Re:/Fwd: prefixes of any case", () => {
    expect(stripSubjectPrefixes("Re: RE: Fwd: FW: hello")).toBe("hello");
  });

  it("leaves a subject with no prefix untouched", () => {
    expect(stripSubjectPrefixes("hello")).toBe("hello");
  });
});

describe("buildReplySubject", () => {
  it("adds exactly one Re: to a bare subject", () => {
    expect(buildReplySubject("Order #123")).toBe("Re: Order #123");
  });

  it("does not double-prefix an already-Re: subject", () => {
    expect(buildReplySubject("Re: Order #123")).toBe("Re: Order #123");
  });

  it("collapses a deeply chained subject to a single Re:", () => {
    expect(buildReplySubject("Re: Re: Fwd: Order #123")).toBe("Re: Order #123");
  });

  it("falls back to a placeholder for a null subject", () => {
    expect(buildReplySubject(null)).toBe("Re: (no subject)");
  });
});

describe("matchInboundEmailToConversation", () => {
  const now = new Date("2026-07-10T00:00:00.000Z");

  it("matches via In-Reply-To against a known Message-ID", () => {
    const map = new Map([["<parent@ourapp.com>", "conv-1"]]);
    const result = matchInboundEmailToConversation(
      headers({ inReplyTo: "<parent@ourapp.com>" }),
      map,
      [],
      now,
    );
    expect(result).toEqual({ conversationId: "conv-1" });
  });

  it("matches via References when In-Reply-To is absent", () => {
    const map = new Map([["<ancestor@ourapp.com>", "conv-2"]]);
    const result = matchInboundEmailToConversation(
      headers({ inReplyTo: null, references: ["<other@x.com>", "<ancestor@ourapp.com>"] }),
      map,
      [],
      now,
    );
    expect(result).toEqual({ conversationId: "conv-2" });
  });

  it("prefers a direct Message-ID match over the subject fallback", () => {
    const map = new Map([["<parent@ourapp.com>", "conv-direct"]]);
    const candidates: RecentConversationCandidate[] = [
      {
        conversationId: "conv-subject",
        contactEmail: "customer@example.com",
        subject: "Help with my order",
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    ];
    const result = matchInboundEmailToConversation(
      headers({ inReplyTo: "<parent@ourapp.com>", subject: "Re: Help with my order" }),
      map,
      candidates,
      now,
    );
    expect(result).toEqual({ conversationId: "conv-direct" });
  });

  it("falls back to sender + normalized subject within 30 days", () => {
    const candidates: RecentConversationCandidate[] = [
      {
        conversationId: "conv-3",
        contactEmail: "customer@example.com",
        subject: "Help with my order",
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    ];
    const result = matchInboundEmailToConversation(
      headers({ subject: "Re: Help with my order" }),
      new Map(),
      candidates,
      now,
    );
    expect(result).toEqual({ conversationId: "conv-3" });
  });

  it("does not match a subject fallback candidate older than 30 days", () => {
    const candidates: RecentConversationCandidate[] = [
      {
        conversationId: "conv-old",
        contactEmail: "customer@example.com",
        subject: "Help with my order",
        createdAt: "2026-05-01T00:00:00.000Z",
      },
    ];
    const result = matchInboundEmailToConversation(
      headers({ subject: "Re: Help with my order" }),
      new Map(),
      candidates,
      now,
    );
    expect(result).toEqual({ newConversation: true });
  });

  it("does not match a subject fallback candidate from a different sender", () => {
    const candidates: RecentConversationCandidate[] = [
      {
        conversationId: "conv-4",
        contactEmail: "someone-else@example.com",
        subject: "Help with my order",
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    ];
    const result = matchInboundEmailToConversation(
      headers({ subject: "Re: Help with my order" }),
      new Map(),
      candidates,
      now,
    );
    expect(result).toEqual({ newConversation: true });
  });

  it("returns newConversation when nothing matches", () => {
    const result = matchInboundEmailToConversation(headers(), new Map(), [], now);
    expect(result).toEqual({ newConversation: true });
  });

  it("ignores a subject match against a conversation with a null subject", () => {
    const candidates: RecentConversationCandidate[] = [
      {
        conversationId: "conv-5",
        contactEmail: "customer@example.com",
        subject: null,
        createdAt: "2026-07-05T00:00:00.000Z",
      },
    ];
    const result = matchInboundEmailToConversation(headers(), new Map(), candidates, now);
    expect(result).toEqual({ newConversation: true });
  });
});

describe("resolveWorkspaceSlugFromRecipient", () => {
  it("extracts the plus-addressed tag as the workspace slug", () => {
    expect(resolveWorkspaceSlugFromRecipient("support+acme@yourdomain.com")).toBe("acme");
  });

  it("returns null when there is no plus tag", () => {
    expect(resolveWorkspaceSlugFromRecipient("support@yourdomain.com")).toBeNull();
  });

  it("returns null for an empty tag", () => {
    expect(resolveWorkspaceSlugFromRecipient("support+@yourdomain.com")).toBeNull();
  });
});

describe("buildOutboundReferences", () => {
  it("returns empty references for the first message in a thread", () => {
    expect(buildOutboundReferences([], null)).toEqual({ inReplyTo: null, references: [] });
  });

  it("appends the immediate parent to prior references", () => {
    const result = buildOutboundReferences(["<a@x.com>", "<b@x.com>"], "<c@x.com>");
    expect(result).toEqual({
      inReplyTo: "<c@x.com>",
      references: ["<a@x.com>", "<b@x.com>", "<c@x.com>"],
    });
  });

  it("does not duplicate the parent if it's already in prior references", () => {
    const result = buildOutboundReferences(["<a@x.com>", "<b@x.com>"], "<b@x.com>");
    expect(result).toEqual({ inReplyTo: "<b@x.com>", references: ["<a@x.com>", "<b@x.com>"] });
  });
});
