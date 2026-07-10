import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Model id per the project spec. Kept as a single named constant since it's the one string most
// likely to need swapping if the deployed account has different model access than assumed at build
// time — everything else in lib/ai/ is written against the constant, not a literal string.
export const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}
