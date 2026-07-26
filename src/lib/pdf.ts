// PDF text extraction. Groq's free models are text-only (no PDF vision), so we
// pull raw text here first, then hand it to the LLM for structuring (Decision 2).
//
// The pdf engine (pdfjs) is heavy, so we import it LAZILY inside the function.
// Otherwise every server action that shares this module's import graph (create
// workspace, generate, save) would pay the load cost on cold start and can time
// out on Vercel. Only actually-parsing-a-PDF should load it.
// pdfjs (inside pdf-parse) needs Promise.withResolvers, which only exists on
// Node 22+. Polyfill it so extraction works even if the host runs older Node.
function ensureWithResolvers() {
  const P = Promise as unknown as { withResolvers?: unknown };
  if (typeof P.withResolvers !== "function") {
    P.withResolvers = function <T>() {
      let resolve!: (v: T | PromiseLike<T>) => void;
      let reject!: (r?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  ensureWithResolvers();
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return (result.text ?? "").trim();
  } finally {
    await parser.destroy?.();
  }
}
