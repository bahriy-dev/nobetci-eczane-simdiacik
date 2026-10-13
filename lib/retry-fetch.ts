class HttpFailure extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfterMs = 0,
  ) {
    super(message);
  }
}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
/** Retry only transient failures; never use old or fabricated results. */
export async function fetchJsonWithRetry<T>(
  url: string,
  signal: AbortSignal,
  {
    fetcher = fetch,
    delayMs = 900,
    attempts = 2,
    timeoutMs = 30000,
  }: {
    fetcher?: typeof fetch;
    delayMs?: number;
    attempts?: number;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal.throwIfAborted();
    try {
      const response = await fetcher(url, {
        signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
        cache: "no-store",
      });
      const payload = (await response.json()) as T & { error?: string };
      if (!response.ok)
        throw new HttpFailure(
          response.status,
          payload.error || "Güncel listeye ulaşılamadı.",
          Math.min(
            30000,
            Math.max(0, Number(response.headers.get("Retry-After")) || 0) *
              1000,
          ),
        );
      return payload;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const transient =
        error instanceof HttpFailure
          ? [408, 429, 500, 502, 503, 504].includes(error.status)
          : error instanceof TypeError ||
            (error instanceof Error &&
              ["TimeoutError", "AbortError"].includes(error.name));
      if (!transient || attempt === attempts - 1) throw error;
      const backoff = delayMs * 2 ** attempt + Math.random() * delayMs * 0.25;
      await pause(
        Math.max(
          backoff,
          error instanceof HttpFailure ? error.retryAfterMs : 0,
        ),
        signal,
      );
    }
  }
  throw new Error("Güncel listeye ulaşılamadı.");
}
