"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { conversationChannelName } from "@/lib/realtime/channels";
import { sendAgentReply, notifyAgentTyping, markConversationRead } from "@/lib/actions/messages";
import { assignConversation, updateConversationStatus } from "@/lib/actions/conversations";
import { ReplyComposer } from "@/components/inbox/reply-composer";
import { SummarizePanel } from "@/components/inbox/summarize-panel";
import { ConversationDetailSkeleton } from "@/components/inbox/conversation-detail-skeleton";
import { AiDraftButton } from "@/components/inbox/ai-draft-button";
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
}: {
  conversationId: string;
  currentUserId: string;
  members: { user_id: string; email: string }[];
}) {
  const [conversation, setConversation] = useState<ConversationWithContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [contactTyping, setContactTyping] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
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
      .channel(conversationChannelName(conversationId))
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
      .subscribe();

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
      <header className="flex items-center justify-between border-b p-3">
        <div>
          <p className="text-sm font-medium">{contactLabel}</p>
          <p className="text-xs text-muted-foreground">
            {conversation.subject || `${conversation.channel} conversation`}
          </p>
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
            <SelectTrigger className="w-40">
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
            <SelectTrigger className="w-28">
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

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender_type === "agent" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                message.sender_type === "agent" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {message.body}
            </div>
          </div>
        ))}
        {contactTyping && <p className="text-xs text-muted-foreground">{contactLabel} is typing…</p>}
      </div>

      {sendError && <p className="px-3 text-sm text-destructive">{sendError}</p>}
      <div className="flex items-center justify-between px-3 pt-3">
        <AiDraftButton
          conversationId={conversationId}
          onDraft={(text) => {
            setDraft(text);
            setShowDraftBanner(true);
          }}
        />
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
