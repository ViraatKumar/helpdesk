import "server-only";
import { z } from "zod";
import { createAnthropicClient, stripCodeFences, ANTHROPIC_MODEL } from "@/lib/ai/client";

const summarySchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  suggested_action: z.string(),
});

export type ConversationSummaryPayload = z.infer<typeof summarySchema>;

const SYSTEM_PROMPT = `You are summarizing a customer support conversation for the agent about to pick it up. Respond with ONLY a JSON object — no prose, no markdown code fences — matching exactly this shape:
{"summary": "2-3 sentence summary of the issue and where it stands", "sentiment": "positive" | "neutral" | "negative", "suggested_action": "one sentence: the single next action the agent should take"}`;

interface TranscriptMessage {
  sender_type: "contact" | "agent";
  body: string;
}

function renderTranscript(messages: TranscriptMessage[]): string {
  return messages
    .map((m) => `${m.sender_type === "agent" ? "Agent" : "Customer"}: ${m.body}`)
    .join("\n");
}

// why strict JSON + strip-fences + zod parse, not free-text: this feeds directly into a UI that
// renders `sentiment` as a colored badge — a stray sentence back from the model would either crash
// the render or silently show garbage. Any failure here should surface as "summary unavailable," not
// a broken page.
export async function generateConversationSummary(
  messages: TranscriptMessage[],
): Promise<ConversationSummaryPayload> {
  const anthropic = createAnthropicClient();

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: renderTranscript(messages) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic returned no text content.");
  }

  const parsed = JSON.parse(stripCodeFences(textBlock.text));
  return summarySchema.parse(parsed);
}
