"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { ConversationWithContact } from "@/lib/types";

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationWithContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No conversations match these filters.</p>;
  }

  return (
    <ul>
      {conversations.map((conversation) => {
        const label =
          conversation.contact?.name || conversation.contact?.email || "Anonymous visitor";
        return (
          <li key={conversation.id}>
            <button
              onClick={() => onSelect(conversation.id)}
              className={`block w-full border-b p-3 text-left text-sm hover:bg-muted ${
                selectedId === conversation.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{label}</span>
                <Badge variant="secondary" className="shrink-0 text-[10px] uppercase">
                  {conversation.channel}
                </Badge>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{conversation.subject || "Chat conversation"}</span>
                <span className="shrink-0">
                  {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
