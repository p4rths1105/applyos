// Retry a transient operation a few times with backoff. Only retries when
// `isTransient` says so (network blips, timeouts, 429/5xx) — never on real
// client errors like 401/403.
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; isTransient?: (e: unknown) => boolean; baseMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 400;
  const isTransient = opts.isTransient ?? (() => true);
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === attempts - 1 || !isTransient(e)) throw e;
      await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Heuristic: is an error worth retrying? Network/timeout errors and 429/5xx.
export function isTransientError(e: unknown): boolean {
  const status = (e as { status?: number })?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  const msg = String((e as Error)?.message ?? e).toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket")
  );
}
