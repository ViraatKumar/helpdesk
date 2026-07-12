"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { conversationChannelName } from "@/lib/realtime/channels";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const ANON_ID_KEY = "helpdesk_widget_anon_id";
const TYPING_DEBOUNCE_MS = 2000;

function getOrCreateAnonymousId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

export function ChatWidget({
  workspaceSlug,
  workspaceName,
}: {
  workspaceSlug: string;
  workspaceName: string;
}) {
  const [contactId, setContactId] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [agentTyping, setAgentTyping] = useState(false);
  const [agentOnline, setAgentOnline] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSentAtRef = useRef(0);
  const agentTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load-or-create the contact + conversation, then subscribe to this conversation's broadcast
  // channel for the rest of the session. One channel per conversation — see README architecture.
  useEffect(() => {
    const anonymousId = getOrCreateAnonymousId();

    fetch("/api/widget/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceSlug, anonymousId }),
    })
      .then((res) => res.json())
      .then((data) => {
        setContactId(data.contactId);
        setContactEmail(data.contactEmail);
        setConversationId(data.conversationId);
        setMessages(data.messages ?? []);
        setShowEmailCapture(!data.contactEmail);
      })
      .finally(() => setInitializing(false));
  }, [workspaceSlug]);

  const markAgentMessagesRead = useCallback(async (convId: string, contId: string) => {
    try {
      await fetch("/api/widget/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, contactId: contId }),
      });
    } catch {
      // ignore silently
    }
  }, []);

  useEffect(() => {
    if (!conversationId || !contactId) return;

    markAgentMessagesRead(conversationId, contactId);

    const supabase = createClient();
    const channel = supabase
      .channel(conversationChannelName(conversationId), {
        config: { presence: { key: contactId } },
      })
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const incoming = payload.message as Message;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        if (incoming.sender_type === "agent") {
          setAgentTyping(false);
          markAgentMessagesRead(conversationId, contactId);
        }
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.from !== "agent") return;
        setAgentTyping(true);
        if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
        agentTypingTimeoutRef.current = setTimeout(() => setAgentTyping(false), 3000);
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
          presences.some((p) => p.userType === "agent")
        );
        setAgentOnline(isOnline);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ userType: "contact" });
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, agentTyping]);

  // why throttled, not debounced: a "typing" indicator should fire near-immediately on the first
  // keystroke, then stay quiet — debouncing would delay the initial signal until the user pauses.
  const notifyTyping = useCallback(() => {
    if (!channelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentAtRef.current < TYPING_DEBOUNCE_MS) return;
    lastTypingSentAtRef.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { from: "contact" } });
  }, []);

  function handleInputChange(value: string) {
    setInput(value);
    notifyTyping();
  }

  async function sendMessage() {
    const body = input.trim();
    if (!body || !conversationId || !contactId || sending) return;

    setSending(true);
    setSendError(null);
    setInput("");
    try {
      const res = await fetch("/api/widget/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, contactId, body }),
      });
      if (!res.ok) throw new Error("send failed");
      // why no optimistic append: the broadcast echo (below) round-trips in well under a second and
      // is the single source of truth for message ordering — appending locally too risks duplicates.
    } catch {
      // Put the message back so the visitor can retry without retyping it.
      setInput(body);
      setSendError("Couldn't send — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function submitEmail() {
    if (!contactId || !emailInput.trim() || savingEmail) return;
    setSavingEmail(true);
    try {
      await fetch("/api/widget/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, email: emailInput.trim() }),
      });
      setContactEmail(emailInput.trim());
      setShowEmailCapture(false);
    } finally {
      setSavingEmail(false);
    }
  }

  function closeWidget() {
    window.parent.postMessage({ type: "helpdesk:close" }, "*");
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative shrink-0">
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold"
            >
              {workspaceName.charAt(0).toUpperCase()}
            </span>
            <span
              className={`absolute right-0 bottom-0 size-2.5 rounded-full ${
                agentOnline ? "bg-success" : "bg-muted"
              } ring-2 ring-primary transition-colors`}
              aria-hidden="true"
              title={agentOnline ? "Online" : "Offline"}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{workspaceName}</p>
            <p className="truncate text-xs opacity-80">
              {agentOnline
                ? "Agent is online"
                : contactEmail
                ? `Chatting as ${contactEmail}`
                : "We usually reply in a few minutes"}
            </p>
          </div>
        </div>
        <button
          onClick={closeWidget}
          aria-label="Close chat"
          className="-my-2 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg leading-none opacity-80 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-foreground/60 active:opacity-100"
        >
          &times;
        </button>
      </header>

      <div
        ref={scrollRef}
        role="log"
        aria-label="Chat messages"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {initializing && (
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-9 w-3/5 rounded-2xl" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-2/5 rounded-2xl" />
            </div>
            <Skeleton className="h-9 w-1/2 rounded-2xl" />
          </div>
        )}
        {!initializing && messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Send a message to start the conversation.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_type === "contact" ? "justify-end" : "justify-start"}`}
          >
            <div className="flex flex-col gap-1 max-w-[80%]">
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap ${
                  message.sender_type === "contact"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                }`}
              >
                {message.body}
              </div>
              {message.sender_type === "contact" && message.read_at && (
                <span className="text-[10px] text-muted-foreground self-end px-1 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
                  Read
                </span>
              )}
            </div>
          </div>
        ))}
        {agentTyping && <p className="text-xs text-muted-foreground">Agent is typing…</p>}
      </div>

      {showEmailCapture && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitEmail();
          }}
          className="border-t bg-muted/30 p-3"
        >
          <p className="mb-2 text-xs text-muted-foreground">
            Leave your email so we can follow up if you step away.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              aria-label="Your email address"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={savingEmail}
              required
              className="h-11"
            />
            <Button type="submit" disabled={savingEmail || !emailInput.trim()} className="h-11 px-4">
              {savingEmail ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}

      {sendError && (
        <p role="alert" className="px-3 pb-1 text-xs text-destructive">
          {sendError}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
          disabled={!conversationId}
          className="h-11"
        />
        <Button type="submit" disabled={!input.trim() || !conversationId} className="h-11 px-4">
          Send
        </Button>
      </form>
    </div>
  );
}
