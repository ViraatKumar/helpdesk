"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { workspaceChannelName } from "@/lib/realtime/channels";
import { ConversationList } from "@/components/inbox/conversation-list";
import { ConversationDetailSkeleton } from "@/components/inbox/conversation-detail-skeleton";
import { InboxFilters } from "@/components/inbox/inbox-filters";
import type { ConversationWithContact } from "@/lib/types";

// The detail pane pulls in tiptap (the single heaviest client dependency) plus the AI panels, none
// of which are needed to render the list. Splitting it keeps the inbox's initial chunk small; the
// skeleton fallback covers the one-time chunk fetch on first selection.
const ConversationDetail = dynamic(
  () => import("@/components/inbox/conversation-detail").then((m) => m.ConversationDetail),
  { loading: () => <ConversationDetailSkeleton /> },
);

export function InboxShell({
  workspaceId,
  currentUserId,
  conversations,
  members,
  filters,
}: {
  workspaceId: string;
  currentUserId: string;
  conversations: ConversationWithContact[];
  members: { user_id: string; email: string }[];
  filters: { status: string; channel: string; assignee: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("c");

  // Selection is URL-driven, so the highlight would otherwise wait a full server round-trip after
  // a click. Track the clicked id locally for instant feedback and show the detail skeleton while
  // the navigation transition is in flight.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isSelecting, startSelecting] = useTransition();

  // Filters are query params → WHERE clauses on the server; this refetches the list from the DB
  // (RLS-scoped) whenever another agent's action changes it, rather than trying to patch client
  // state in place.
  const refreshRef = useRef(router.refresh);
  useEffect(() => {
    refreshRef.current = router.refresh;
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(workspaceChannelName(workspaceId))
      .on("broadcast", { event: "conversation_updated" }, () => {
        // refreshRef.current();
        console.log("conversation_updated received!");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  function selectConversation(id: string) {
    if (id === selectedId) return;
    setPendingId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", id);
    startSelecting(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const highlightedId = isSelecting && pendingId ? pendingId : selectedId;
  const detailPending = isSelecting && pendingId !== null && pendingId !== selectedId;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <h1 className="text-sm font-semibold">Inbox</h1>
        <InboxFilters filters={filters} members={members} />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r">
          <ConversationList
            conversations={conversations}
            selectedId={highlightedId}
            onSelect={selectConversation}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {detailPending ? (
            <ConversationDetailSkeleton />
          ) : selectedId ? (
            <ConversationDetail
              key={selectedId}
              conversationId={selectedId}
              currentUserId={currentUserId}
              members={members}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted/20 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <MessagesSquare className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium">Select a conversation</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a conversation from the list to read and reply.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
