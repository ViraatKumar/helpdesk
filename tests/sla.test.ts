import { describe, it, expect } from "vitest";
import { computeSlaStatus, worstSlaState } from "@/lib/sla";

// Conversation created at noon; policy: first response 60m, resolution 8h.
const CREATED = "2026-07-13T12:00:00.000Z";
const policy = { firstResponseMinutes: 60, resolutionMinutes: 480 };

function conversation(overrides: Partial<{
  created_at: string;
  first_agent_reply_at: string | null;
  closed_at: string | null;
}> = {}) {
  return {
    created_at: CREATED,
    first_agent_reply_at: null,
    closed_at: null,
    ...overrides,
  };
}

function at(minutesAfterCreation: number): Date {
  return new Date(Date.parse(CREATED) + minutesAfterCreation * 60_000);
}

describe("computeSlaStatus — first response", () => {
  it("returns null targets when the policy has no limits", () => {
    const result = computeSlaStatus(
      conversation(),
      { firstResponseMinutes: null, resolutionMinutes: null },
      at(30),
    );
    expect(result.firstResponse).toBeNull();
    expect(result.resolution).toBeNull();
  });

  it("is met when the first agent reply landed before the deadline", () => {
    const result = computeSlaStatus(
      conversation({ first_agent_reply_at: at(45).toISOString() }),
      policy,
      at(200),
    );
    expect(result.firstResponse?.state).toBe("met");
  });

  it("stays breached when the first reply came after the deadline", () => {
    const result = computeSlaStatus(
      conversation({ first_agent_reply_at: at(90).toISOString() }),
      policy,
      at(200),
    );
    expect(result.firstResponse?.state).toBe("breached");
  });

  it("is pending early in the window with no reply", () => {
    const result = computeSlaStatus(conversation(), policy, at(10));
    expect(result.firstResponse?.state).toBe("pending");
    expect(result.firstResponse?.dueAt).toBe(at(60).toISOString());
  });

  it("is due_soon once 80% of the window has elapsed", () => {
    const result = computeSlaStatus(conversation(), policy, at(50));
    expect(result.firstResponse?.state).toBe("due_soon");
  });

  it("is breached once the deadline passes with no reply", () => {
    const result = computeSlaStatus(conversation(), policy, at(61));
    expect(result.firstResponse?.state).toBe("breached");
  });
});

describe("computeSlaStatus — resolution", () => {
  it("is met when closed before the resolution deadline", () => {
    const result = computeSlaStatus(
      conversation({ closed_at: at(300).toISOString() }),
      policy,
      at(1000),
    );
    expect(result.resolution?.state).toBe("met");
  });

  it("is breached when closed after the resolution deadline", () => {
    const result = computeSlaStatus(
      conversation({ closed_at: at(500).toISOString() }),
      policy,
      at(1000),
    );
    expect(result.resolution?.state).toBe("breached");
  });

  it("is pending while open inside the window", () => {
    const result = computeSlaStatus(conversation(), policy, at(60));
    expect(result.resolution?.state).toBe("pending");
    expect(result.resolution?.dueAt).toBe(at(480).toISOString());
  });

  it("is breached while still open past the deadline", () => {
    const result = computeSlaStatus(conversation(), policy, at(481));
    expect(result.resolution?.state).toBe("breached");
  });
});

describe("worstSlaState", () => {
  it("prefers breached over due_soon", () => {
    const status = computeSlaStatus(conversation(), policy, at(400));
    // first response long breached; resolution at 83% of window → due_soon
    expect(status.firstResponse?.state).toBe("breached");
    expect(status.resolution?.state).toBe("due_soon");
    expect(worstSlaState(status)).toBe("breached");
  });

  it("returns due_soon when that is the worst", () => {
    const status = computeSlaStatus(
      conversation({ first_agent_reply_at: at(10).toISOString() }),
      policy,
      at(400),
    );
    expect(worstSlaState(status)).toBe("due_soon");
  });

  it("returns null when nothing needs attention", () => {
    const status = computeSlaStatus(
      conversation({ first_agent_reply_at: at(10).toISOString() }),
      policy,
      at(100),
    );
    expect(worstSlaState(status)).toBeNull();
  });
});
