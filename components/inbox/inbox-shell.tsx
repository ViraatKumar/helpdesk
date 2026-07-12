"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
        refreshRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  function selectConversation(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("c", id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex h-screen flex-col">
      <InboxFilters filters={filters} members={members} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-y-auto border-r">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={selectConversation}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedId ? (
            <ConversationDetail
              key={selectedId}
              conversationId={selectedId}
              currentUserId={currentUserId}
              members={members}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
