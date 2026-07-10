"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Stretch feature: fills the composer with an AI-generated draft the agent must review before
// sending — it never sends on its own. See lib/ai/draft-reply.ts.
export function AiDraftButton({
  conversationId,
  onDraft,
}: {
  conversationId: string;
  onDraft: (draft: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/draft-reply`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate a draft.");
      onDraft(data.draft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate a draft.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? "Drafting…" : "AI draft"}
    </Button>
  );
}
