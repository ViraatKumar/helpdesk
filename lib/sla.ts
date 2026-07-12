// Pure SLA computation — no I/O, injected clock. Mirrored by tests/sla.test.ts.
// first_agent_reply_at / closed_at are stamped on the write paths (lib/actions/messages.ts,
// lib/actions/conversations.ts); this module only interprets them against the workspace policy.

export interface SlaPolicyInput {
  firstResponseMinutes: number | null;
  resolutionMinutes: number | null;
}

export interface SlaConversationFields {
  created_at: string;
  first_agent_reply_at: string | null;
  closed_at: string | null;
}

export type SlaTargetState = "met" | "pending" | "due_soon" | "breached";

export interface SlaTargetStatus {
  state: SlaTargetState;
  dueAt: string;
}

export interface SlaStatus {
  firstResponse: SlaTargetStatus | null;
  resolution: SlaTargetStatus | null;
}

// A target flips to due_soon once 80% of its window has elapsed.
const DUE_SOON_THRESHOLD = 0.8;

function computeTarget(
  createdAtMs: number,
  completedAt: string | null,
  targetMinutes: number | null,
  now: Date,
): SlaTargetStatus | null {
  if (targetMinutes === null) return null;

  const dueAtMs = createdAtMs + targetMinutes * 60_000;
  const dueAt = new Date(dueAtMs).toISOString();

  if (completedAt !== null) {
    return { state: Date.parse(completedAt) <= dueAtMs ? "met" : "breached", dueAt };
  }
  if (now.getTime() > dueAtMs) {
    return { state: "breached", dueAt };
  }
  const elapsedFraction = (now.getTime() - createdAtMs) / (targetMinutes * 60_000);
  return { state: elapsedFraction >= DUE_SOON_THRESHOLD ? "due_soon" : "pending", dueAt };
}

export function computeSlaStatus(
  conversation: SlaConversationFields,
  policy: SlaPolicyInput,
  now: Date,
): SlaStatus {
  const createdAtMs = Date.parse(conversation.created_at);
  return {
    firstResponse: computeTarget(
      createdAtMs,
      conversation.first_agent_reply_at,
      policy.firstResponseMinutes,
      now,
    ),
    resolution: computeTarget(createdAtMs, conversation.closed_at, policy.resolutionMinutes, now),
  };
}

/**
 * The single state worth surfacing on a compact badge: breached beats due_soon; met/pending
 * render nothing (null) so quiet conversations stay quiet.
 */
export function worstSlaState(status: SlaStatus): "breached" | "due_soon" | null {
  const states = [status.firstResponse?.state, status.resolution?.state];
  if (states.includes("breached")) return "breached";
  if (states.includes("due_soon")) return "due_soon";
  return null;
}
