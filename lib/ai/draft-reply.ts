import "server-only";
import { createAnthropicClient, ANTHROPIC_MODEL } from "@/lib/ai/client";

interface TranscriptMessage {
  sender_type: "contact" | "agent";
  body: string;
}

const SYSTEM_PROMPT = `You draft reply suggestions for a customer support agent. Given the conversation so far and a list of relevant knowledge base article titles, write a short, friendly draft reply to the customer's most recent message. Reference a KB article by title only if it's actually relevant. Respond with ONLY the plain-text reply body — no subject line, no JSON, no commentary, no markdown.`;

// Stretch feature (spec: ~1h budget). Deliberately plain text, not JSON — this fills a rich-text
// composer the agent is expected to read and edit before sending, not a machine-parsed field like
// the summary.
export async function generateReplyDraft(
  messages: TranscriptMessage[],
  kbArticleTitles: string[],
): Promise<string> {
  const anthropic = createAnthropicClient();

  const transcript = messages
    .map((m) => `${m.sender_type === "agent" ? "Agent" : "Customer"}: ${m.body}`)
    .join("\n");

  const context = [
    `Conversation:\n${transcript}`,
    kbArticleTitles.length > 0
      ? `Available KB articles:\n${kbArticleTitles.map((t) => `- ${t}`).join("\n")}`
      : "No KB articles available.",
  ].join("\n\n");

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: context }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic returned no text content.");
  }

  return textBlock.text.trim();
}
