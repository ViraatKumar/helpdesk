"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { conversationChannelName } from "@/lib/realtime/channels";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Message } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");

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
      });
  }, [workspaceSlug]);

  useEffect(() => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(conversationChannelName(conversationId))
      .on("broadcast", { event: "new_message" }, ({ payload }) => {
        const incoming = payload.message as Message;
        setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        if (incoming.sender_type === "agent") setAgentTyping(false);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.from !== "agent") return;
        setAgentTyping(true);
        if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
        agentTypingTimeoutRef.current = setTimeout(() => setAgentTyping(false), 3000);
      })
      .subscribe();

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
    } finally {
      setSending(false);
    }
  }

  async function submitEmail() {
    if (!contactId || !emailInput.trim()) return;
    await fetch("/api/widget/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, email: emailInput.trim() }),
    });
    setContactEmail(emailInput.trim());
    setShowEmailCapture(false);
  }

  function closeWidget() {
    window.parent.postMessage({ type: "helpdesk:close" }, "*");
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <div>
          <p className="text-sm font-semibold">{workspaceName}</p>
          <p className="text-xs opacity-80">
            {contactEmail ? `Chatting as ${contactEmail}` : "We usually reply in a few minutes"}
          </p>
        </div>
        <button
          onClick={closeWidget}
          aria-label="Close chat"
          className="rounded-full px-2 py-1 text-lg leading-none opacity-80 hover:opacity-100"
        >
          &times;
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Send a message to start the conversation.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender_type === "contact" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                message.sender_type === "contact"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.body}
            </div>
          </div>
        ))}
        {agentTyping && <p className="text-xs text-muted-foreground">Agent is typing…</p>}
      </div>

      {showEmailCapture && (
        <div className="border-t bg-muted/30 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Leave your email so we can follow up if you step away.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={submitEmail}>
              Save
            </Button>
          </div>
        </div>
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
          disabled={!conversationId}
        />
        <Button type="submit" disabled={!input.trim() || !conversationId}>
          Send
        </Button>
      </form>
    </div>
  );
}
