import Groq from "groq-sdk";
import type { LLMProvider, CompletionOpts } from "./provider";

// Groq free tier. Llama 3.3 70B is the strongest free general model for
// extraction + generation. Text-only (no PDF vision) — see lib/pdf.ts for why
// we extract text first.
const DEFAULT_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

let client: Groq | null = null;
function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not set. Get a free key at https://console.groq.com/keys and add it to .env",
      );
    }
    client = new Groq({ apiKey });
  }
  return client;
}

export class GroqProvider implements LLMProvider {
  readonly name = "groq";

  async complete(opts: CompletionOpts): Promise<string> {
    const res = await getClient().chat.completions.create({
      model: DEFAULT_MODEL,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    });
    return res.choices[0]?.message?.content ?? "";
  }
}
