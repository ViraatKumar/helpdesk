import "server-only";
import { GoogleGenAI } from "@google/genai";

// Model id per the project spec. Kept as a single named constant since it's the one string most
// likely to need swapping if the deployed account has different model access than assumed at build
// time — everything else in lib/ai/ is written against the constant, not a literal string.
export const GEMINI_MODEL = "gemini-3.5-flash";

export function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}
