import type { LLMProvider } from "./provider";
import { GroqProvider } from "./groq";

// Factory — the single switch point for the LLM vendor.
// To move to Claude later: add anthropic.ts implementing LLMProvider,
// then return it here based on an env flag. Nothing else changes.
let provider: LLMProvider | null = null;

export function llm(): LLMProvider {
  if (!provider) {
    provider = new GroqProvider();
  }
  return provider;
}

export type { LLMProvider, ChatMessage, CompletionOpts } from "./provider";
