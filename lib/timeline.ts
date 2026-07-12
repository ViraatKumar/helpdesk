// Pure contact-timeline shaping — no I/O. Mirrored by tests/contact-timeline.test.ts.
// The component fetches the contact's conversations (RLS-scoped); this decides order and stats.

export interface TimelineConversation {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  created_at: string;
  last_message_at: string;
}

export interface ContactTimeline {
  stats: {
    totalConversations: number;
    openConversations: number;
    firstSeenAt: string | null;
    lastActiveAt: string | null;
  };
  entries: Array<TimelineConversation & { isCurrent: boolean }>;
}

export function buildContactTimeline(
  conversations: TimelineConversation[],
  currentConversationId: string,
): ContactTimeline {
  const entries = [...conversations]
    .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at))
    .map((conversation) => ({
      ...conversation,
      isCurrent: conversation.id === currentConversationId,
    }));

  let firstSeenAt: string | null = null;
  let lastActiveAt: string | null = null;
  for (const conversation of conversations) {
    if (firstSeenAt === null || Date.parse(conversation.created_at) < Date.parse(firstSeenAt)) {
      firstSeenAt = conversation.created_at;
    }
    if (
      lastActiveAt === null ||
      Date.parse(conversation.last_message_at) > Date.parse(lastActiveAt)
    ) {
      lastActiveAt = conversation.last_message_at;
    }
  }

  return {
    stats: {
      totalConversations: conversations.length,
      openConversations: conversations.filter((c) => c.status === "open").length,
      firstSeenAt,
      lastActiveAt,
    },
    entries,
  };
}
