import { PDFParse } from "pdf-parse";

// PDF text extraction. Groq's free models are text-only (no PDF vision), so we
// pull raw text here first, then hand it to the LLM for structuring (Decision 2).
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text ?? "").trim();
  } finally {
    await parser.destroy?.();
  }
}
