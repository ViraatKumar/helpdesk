"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { conversationChannelName } from "@/lib/realtime/channels";
import { sendAgentReply, notifyAgentTyping, markConversationRead } from "@/lib/actions/messages";
import { assignConversation, updateConversationStatus } from "@/lib/actions/conversations";
import { initialsFor } from "@/lib/utils";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { SummarizePanel } from "@/components/inbox/summarize-panel";
import { ConversationDetailSkeleton } from "@/components/inbox/conversation-detail-skeleton";
import { AiDraftButton } from "@/components/inbox/ai-draft-button";
import { CannedPicker } from "@/components/inbox/canned-picker";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ConversationWithContact, Message, ConversationStatus } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPING_THROTTLE_MS = 2000;

export function ConversationDetail({
  conversationId,
  currentUserId,
  members,
  workspaceId,
  workspaceName,
}: {
  conversationId: string;
  currentUserId: string;
  members: { user_id: string; email: string }[];
  workspaceId: string;
  workspaceName: string;
}) {
  const [conversation, setConversation] = useState<ConversationWithContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [contactTyping, setContactTyping] = useState(false);
  const [contactOnline, setContactOnline] = useState(false);
  const [draft, setDraft] = useState<{ text: string; nonce: number } | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAtRef = useRef(0);
  const contactTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const [{ data: conv }, { data: msgs }] = await Promise.all([
        supabase.from("conversations").select("*, contact:contacts(*)").eq("id", conversationId).single(),
        supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at"),
      ]);
      if (cancelled) return;
      setConversation(conv as ConversationWithContact);
      setMessages(msgs ?? []);
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Read receipts: stamp read_at the moment this pane has the conversation focused, not on a timer.
  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(conversationChannelName(conversationId), {
        config: { presence: { key: currentUserId } },
      })
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const incoming = payload.message as Message;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        if (incoming.sender_type === "contact") {
          setContactTyping(false);
          markConversationRead(conversationId);
        }
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.from !== "contact") return;
        setContactTyping(true);
        if (contactTypingTimeoutRef.current) clearTimeout(contactTypingTimeoutRef.current);
        contactTypingTimeoutRef.current = setTimeout(() => setContactTyping(false), 3000);
      })
      .on("broadcast", { event: "read_receipt" }, ({ payload }) => {
        const { message_ids } = payload;
        setMessages((prev) =>
          prev.map((m) => (message_ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m))
        );
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userType: string }>();
        const isOnline = Object.values(state).some((presences) =>
          presences.some((p) => p.userType === "contact")
        );
        setContactOnline(isOnline);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ userType: "agent" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, contactTyping]);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentAtRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentAtRef.current = now;
    notifyAgentTyping(conversationId);
  }, [conversationId]);

  async function handleSend(text: string, html: string) {
    setSending(true);
    setSendError(null);
    const result = await sendAgentReply(conversationId, text, html);
    if (result.error) {
      setSendError(result.error);
    } else {
      setShowDraftBanner(false);
    }
    setSending(false);
  }

  if (!conversation) {
    return <ConversationDetailSkeleton />;
  }

  const contactLabel = conversation.contact?.name || conversation.contact?.email || "Anonymous visitor";

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary relative"
          >
            {initialsFor(contactLabel)}
            {contactOnline && (
              <span
                className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-background"
                aria-hidden="true"
                title="Online"
              />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{contactLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {conversation.subject || `${conversation.channel} conversation`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={conversation.assignee_id ?? "unassigned"}
            onValueChange={(v) => {
              if (!v) return;
              const assigneeId = v === "unassigned" ? null : v;
              setConversation((c) => (c ? { ...c, assignee_id: assigneeId } : c));
              assignConversation(conversationId, assigneeId);
            }}
          >
            <SelectTrigger className="w-40" aria-label="Assignee">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.user_id === currentUserId ? "Me" : m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={conversation.status}
            onValueChange={(v) => {
              if (!v) return;
              const status = v as ConversationStatus;
              setConversation((c) => (c ? { ...c, status } : c));
              updateConversationStatus(conversationId, status);
            }}
          >
            <SelectTrigger className="w-28" aria-label="Conversation status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="snoozed">Snoozed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <SummarizePanel conversationId={conversationId} />

      <div
        ref={scrollRef}
        role="log"
        aria-label={`Conversation with ${contactLabel}`}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_type === "agent" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col gap-1 max-w-[75%]">
              <div
                title={new Date(message.created_at).toLocaleString()}
                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  message.sender_type === "agent"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border bg-card"
                }`}
              >
                {message.body}
              </div>
              {message.sender_type === "agent" && message.read_at && (
                <span className="text-[10px] text-muted-foreground self-end px-1 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                  Read
                </span>
              )}
            </div>
          </div>
        ))}
        {contactTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-3.5 py-3">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
              <span className="sr-only">{contactLabel} is typing</span>
            </div>
          </div>
        )}
      </div>

      {sendError && <p className="px-3 text-sm text-destructive">{sendError}</p>}
      <div className="flex items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-2">
          <AiDraftButton
            conversationId={conversationId}
            onDraft={(text) => {
              setDraft({ text, nonce: Date.now() });
              setShowDraftBanner(true);
            }}
          />
          <CannedPicker
            workspaceId={workspaceId}
            variables={{
              contact_name: conversation.contact?.name ?? undefined,
              agent_name: members
                .find((m) => m.user_id === currentUserId)
                ?.email.split("@")[0],
              workspace_name: workspaceName,
            }}
            onInsert={(text) => {
              setDraft({ text, nonce: Date.now() });
              setShowDraftBanner(false);
            }}
          />
        </div>
        {showDraftBanner && (
          <span className="text-xs text-muted-foreground">AI draft — review before sending</span>
        )}
      </div>
      <ReplyComposer
        onSend={handleSend}
        onTyping={handleTyping}
        sending={sending}
        placeholder={conversation.channel === "email" ? "Write an email reply…" : "Write a reply…"}
        draftContent={draft}
      />
    </div>
  );
}
