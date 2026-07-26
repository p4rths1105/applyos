// Provider interface — the ONE place the LLM vendor is named.
// Swapping Groq -> Claude later means adding one file and changing the factory,
// nothing else in the app touches a vendor SDK directly.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOpts {
  messages: ChatMessage[];
  // Lower for structured extraction, higher for voice-matched prose.
  temperature?: number;
  // Ask the provider for a JSON object back when true.
  json?: boolean;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(opts: CompletionOpts): Promise<string>;
}
