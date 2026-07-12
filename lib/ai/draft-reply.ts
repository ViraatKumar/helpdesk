import "server-only";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/ai/client";

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
  const gemini = createGeminiClient();

  const transcript = messages
    .map((m) => `${m.sender_type === "agent" ? "Agent" : "Customer"}: ${m.body}`)
    .join("\n");

  const context = [
    `Conversation:\n${transcript}`,
    kbArticleTitles.length > 0
      ? `Available KB articles:\n${kbArticleTitles.map((t) => `- ${t}`).join("\n")}`
      : "No KB articles available.",
  ].join("\n\n");

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: context,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  if (!response.text) {
    throw new Error("Gemini returned no text content.");
  }

  return response.text.trim();
}
