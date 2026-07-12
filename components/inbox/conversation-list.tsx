"use client";

import { formatDistanceToNow } from "date-fns";
import { Inbox, Mail, MessageSquare } from "lucide-react";
import { cn, initialsFor } from "@/lib/utils";
import { SlaBadge } from "@/components/inbox/sla-badge";
import type { ConversationWithContact, SlaPolicy } from "@/lib/types";

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  slaPolicy,
}: {
  conversations: ConversationWithContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  slaPolicy: SlaPolicy | null;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <Inbox className="size-5 text-muted-foreground/70" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No conversations match these filters.</p>
      </div>
    );
  }

  return (
    <ul>
      {conversations.map((conversation) => {
        const label =
          conversation.contact?.name || conversation.contact?.email || "Anonymous visitor";
        const selected = selectedId === conversation.id;
        const ChannelIcon = conversation.channel === "email" ? Mail : MessageSquare;
        return (
          <li key={conversation.id}>
            <button
              onClick={() => onSelect(conversation.id)}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "relative block min-h-11 w-full cursor-pointer border-b border-border/40 px-4 py-4 text-left text-sm outline-none transition-all duration-200 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 active:bg-muted/60",
                selected && "bg-muted/60 shadow-[inset_3px_0_0_0_var(--color-primary)]",
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
                >
                  {initialsFor(label)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-medium">{label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-1.5 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <ChannelIcon className="size-3 shrink-0" aria-hidden="true" />
                      <span className="sr-only">{conversation.channel}:</span>
                      <span className="truncate">
                        {conversation.subject || "Chat conversation"}
                      </span>
                    </span>
                    <SlaBadge conversation={conversation} policy={slaPolicy} />
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
