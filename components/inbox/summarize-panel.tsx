"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Summary {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  suggested_action: string;
}

// Neutral/negative map to theme tokens; positive keeps an emerald accent with an explicit dark
// variant since the palette has no "success" token.
const SENTIMENT_CLASSES: Record<Summary["sentiment"], string> = {
  positive:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400",
  neutral: "bg-muted text-muted-foreground hover:bg-muted",
  negative: "bg-destructive/10 text-destructive hover:bg-destructive/10 dark:bg-destructive/20",
};

export function SummarizePanel({ conversationId }: { conversationId: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSummarize() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/summarize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize.");
      setSummary(data.summary);
    } catch (err) {
      // why a toast, not an inline error: an LLM call failing should never break the inbox — the
      // conversation is still fully usable, this is a nice-to-have that degraded gracefully.
      toast.error(err instanceof Error ? err.message : "Failed to summarize.");
    } finally {
      setLoading(false);
    }
  }

  if (!summary) {
    return (
      <div className="border-b p-3">
        <Button variant="outline" size="sm" onClick={handleSummarize} disabled={loading}>
          {loading ? "Summarizing…" : "Summarize"}
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className="space-y-2 border-b bg-muted/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <Badge className={SENTIMENT_CLASSES[summary.sentiment]}>{summary.sentiment}</Badge>
        <Button variant="ghost" size="sm" onClick={handleSummarize} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <p>{summary.summary}</p>
      <p className="text-muted-foreground">
        <strong className="text-foreground">Next step: </strong>
        {summary.suggested_action}
      </p>
    </div>
  );
}
