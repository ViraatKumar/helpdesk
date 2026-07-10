// Pure email-threading logic — no I/O, no Date.now(), no Supabase client. The one place the spec
// mandates unit tests, because a wrong match here silently merges two customers' threads or splits
// one customer's thread in two, and neither failure mode is visible until a support agent notices.

const SUBJECT_PREFIX_RE = /^(re|fwd?|fw)\s*:\s*/i;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Strips every leading Re:/Fwd:/Fw: prefix (mail clients chain them: "Re: Re: Fwd: hello"), so both
// sides of a subject-based match compare the same underlying subject regardless of reply depth.
export function stripSubjectPrefixes(subject: string): string {
  let result = subject.trim();
  while (SUBJECT_PREFIX_RE.test(result)) {
    result = result.replace(SUBJECT_PREFIX_RE, "").trim();
  }
  return result;
}

function normalizeSubjectForMatching(subject: string): string {
  return stripSubjectPrefixes(subject).toLowerCase();
}

// why "exactly once": chaining replies ("Re: Re: Re: ...") is the single most common thing that makes
// an email thread look broken to a recipient. Always strip first, then add back exactly one prefix.
export function buildReplySubject(subject: string | null): string {
  const base = subject?.trim() || "(no subject)";
  return `Re: ${stripSubjectPrefixes(base)}`;
}

export interface InboundEmailHeaders {
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string;
  subject: string;
  date: string; // ISO 8601
}

export interface RecentConversationCandidate {
  conversationId: string;
  contactEmail: string;
  subject: string | null;
  createdAt: string; // ISO 8601
}

export type ThreadMatch = { conversationId: string } | { newConversation: true };

/**
 * Decide which conversation an inbound email belongs to.
 *
 * @param headers Parsed headers of the inbound email.
 * @param messageIdToConversationId Every known Message-ID we've sent or received, mapped to its
 *   conversation. Callers build this from the subset of ids actually referenced by this email
 *   (In-Reply-To + References) — not the whole table — to keep the lookup cheap.
 * @param recentConversations Conversations for the same sender email, most recent first, used only
 *   for the subject-match fallback.
 * @param now Injected clock for the 30-day window, so tests don't depend on wall-clock time.
 */
export function matchInboundEmailToConversation(
  headers: InboundEmailHeaders,
  messageIdToConversationId: Map<string, string>,
  recentConversations: RecentConversationCandidate[],
  now: Date,
): ThreadMatch {
  // 1. Direct thread match: In-Reply-To or any References id we've seen before.
  const referencedIds = [headers.inReplyTo, ...headers.references].filter(
    (id): id is string => Boolean(id),
  );
  for (const id of referencedIds) {
    const conversationId = messageIdToConversationId.get(id);
    if (conversationId) {
      return { conversationId };
    }
  }

  // 2. Fallback: same sender + same normalized subject, started within the last 30 days. Handles
  // mail clients that drop References/In-Reply-To (some webmail "reply" flows do) or a first reply
  // to an outbound message we sent outside a tracked thread.
  const normalizedIncomingSubject = normalizeSubjectForMatching(headers.subject);
  const cutoff = now.getTime() - THIRTY_DAYS_MS;

  const subjectMatch = recentConversations.find(
    (candidate) =>
      candidate.contactEmail.toLowerCase() === headers.fromEmail.toLowerCase() &&
      candidate.subject !== null &&
      normalizeSubjectForMatching(candidate.subject) === normalizedIncomingSubject &&
      new Date(candidate.createdAt).getTime() >= cutoff,
  );
  if (subjectMatch) {
    return { conversationId: subjectMatch.conversationId };
  }

  // 3. No match — this is the start of a new thread.
  return { newConversation: true };
}

// Support inbound multi-tenancy via plus-addressing (support+acme@yourdomain.com) without a schema
// change: the local-part tag after "+" is the workspace slug. Falls back to null (caller resolves to
// a default workspace) when the address has no tag — the common case for a single-workspace deploy.
export function resolveWorkspaceSlugFromRecipient(toAddress: string): string | null {
  const localPart = toAddress.split("@")[0] ?? "";
  const plusIndex = localPart.indexOf("+");
  if (plusIndex === -1) return null;
  const tag = localPart.slice(plusIndex + 1).trim();
  return tag || null;
}

// Builds the References header for an outbound reply: every prior Message-ID in the thread, in
// chronological order, per RFC 5322 §3.6.4 (References is the full ancestry, In-Reply-To is just the
// immediate parent).
export function buildOutboundReferences(priorMessageIds: string[], immediateParentId: string | null): {
  inReplyTo: string | null;
  references: string[];
} {
  if (!immediateParentId) {
    return { inReplyTo: null, references: [] };
  }
  const references = priorMessageIds.includes(immediateParentId)
    ? priorMessageIds
    : [...priorMessageIds, immediateParentId];
  return { inReplyTo: immediateParentId, references };
}
