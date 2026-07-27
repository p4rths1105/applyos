// PDF text extraction. Groq's free models are text-only (no PDF vision), so we
// pull raw text here first, then hand it to the LLM for structuring (Decision 2).
//
// We use `unpdf` (a serverless-first pdfjs build) instead of pdf-parse/pdfjs-dist,
// which crash on Vercel with "DOMMatrix is not defined" because they expect
// browser graphics globals. unpdf needs no DOM and runs in Node/edge/workers.
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return (text ?? "").trim();
}
