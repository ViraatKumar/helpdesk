"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Mail, MessageSquare, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildContactTimeline, type TimelineConversation } from "@/lib/timeline";
import { cn, initialsFor } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact } from "@/lib/types";

const STATUS_DOT: Record<string, string> = {
  open: "bg-success",
  snoozed: "bg-warning",
  closed: "bg-muted-foreground/50",
};

export function ContactTimelinePanel({
  contact,
  currentConversationId,
  onSelectConversation,
}: {
  contact: Contact | null;
  currentConversationId: string;
  onSelectConversation?: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<TimelineConversation[] | null>(null);

  useEffect(() => {
    if (!contact) return;
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("conversations")
      .select("id, channel, status, subject, created_at, last_message_at")
      .eq("contact_id", contact.id)
      .then(({ data }) => {
        if (!cancelled) setConversations((data ?? []) as TimelineConversation[]);
      });
    return () => {
      cancelled = true;
    };
  }, [contact]);

  if (!contact) return null;

  const label = contact.name || contact.email || "Anonymous visitor";
  const timeline = conversations ? buildContactTimeline(conversations, currentConversationId) : null;

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-sm">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
        >
          {initialsFor(label)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{label}</p>
          {contact.email && (
            <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
          )}
        </div>
      </div>

      {!timeline ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <dl className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Conversations</dt>
              <dd className="font-medium">
                {timeline.stats.totalConversations}
                {timeline.stats.openConversations > 0 && (
                  <span className="text-muted-foreground"> · {timeline.stats.openConversations} open</span>
                )}
              </dd>
            </div>
            {timeline.stats.firstSeenAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">First seen</dt>
                <dd className="font-medium">{format(new Date(timeline.stats.firstSeenAt), "d MMM yyyy")}</dd>
              </div>
            )}
            {timeline.stats.lastActiveAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last active</dt>
                <dd className="font-medium">
                  {formatDistanceToNow(new Date(timeline.stats.lastActiveAt), { addSuffix: true })}
                </dd>
              </div>
            )}
          </dl>

          <div className="min-h-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <History className="size-3.5" aria-hidden="true" />
              History
            </p>
            <ul className="mt-2 space-y-1">
              {timeline.entries.map((entry) => {
                const ChannelIcon = entry.channel === "email" ? Mail : MessageSquare;
                return (
                  <li key={entry.id}>
                    <button
                      disabled={entry.isCurrent}
                      onClick={() => onSelectConversation?.(entry.id)}
                      className={cn(
                        "w-full rounded-md border px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                        entry.isCurrent
                          ? "border-primary/30 bg-accent/60"
                          : "cursor-pointer hover:bg-accent/50",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-xs">
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[entry.status])}
                          aria-hidden="true"
                        />
                        <ChannelIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate font-medium">
                          {entry.subject || "Chat conversation"}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {entry.isCurrent
                          ? "Current conversation"
                          : formatDistanceToNow(new Date(entry.last_message_at), { addSuffix: true })}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
