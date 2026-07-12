import { describe, it, expect } from "vitest";
import { buildContactTimeline } from "@/lib/timeline";

function conv(overrides: Partial<{
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
}> = {}) {
  return {
    id: "c1",
    channel: "chat",
    status: "open",
    subject: null,
    created_at: "2026-07-01T10:00:00.000Z",
    last_message_at: "2026-07-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("buildContactTimeline", () => {
  it("returns empty stats for a contact with no conversations", () => {
    const timeline = buildContactTimeline([], "c1");
    expect(timeline.entries).toEqual([]);
    expect(timeline.stats).toEqual({
      totalConversations: 0,
      openConversations: 0,
      firstSeenAt: null,
      lastActiveAt: null,
    });
  });

  it("sorts entries by most recent activity first", () => {
    const timeline = buildContactTimeline(
      [
        conv({ id: "old", last_message_at: "2026-07-01T09:00:00.000Z" }),
        conv({ id: "new", last_message_at: "2026-07-03T09:00:00.000Z" }),
        conv({ id: "mid", last_message_at: "2026-07-02T09:00:00.000Z" }),
      ],
      "old",
    );
    expect(timeline.entries.map((e) => e.id)).toEqual(["new", "mid", "old"]);
  });

  it("flags the currently open conversation", () => {
    const timeline = buildContactTimeline([conv({ id: "a" }), conv({ id: "b" })], "b");
    expect(timeline.entries.find((e) => e.id === "b")?.isCurrent).toBe(true);
    expect(timeline.entries.find((e) => e.id === "a")?.isCurrent).toBe(false);
  });

  it("counts only open conversations in openConversations", () => {
    const timeline = buildContactTimeline(
      [
        conv({ id: "a", status: "open" }),
        conv({ id: "b", status: "closed" }),
        conv({ id: "c", status: "snoozed" }),
      ],
      "a",
    );
    expect(timeline.stats.totalConversations).toBe(3);
    expect(timeline.stats.openConversations).toBe(1);
  });

  it("derives first seen and last active from the full history", () => {
    const timeline = buildContactTimeline(
      [
        conv({
          id: "a",
          created_at: "2026-06-01T00:00:00.000Z",
          last_message_at: "2026-06-02T00:00:00.000Z",
        }),
        conv({
          id: "b",
          created_at: "2026-07-01T00:00:00.000Z",
          last_message_at: "2026-07-05T00:00:00.000Z",
        }),
      ],
      "b",
    );
    expect(timeline.stats.firstSeenAt).toBe("2026-06-01T00:00:00.000Z");
    expect(timeline.stats.lastActiveAt).toBe("2026-07-05T00:00:00.000Z");
  });
});
