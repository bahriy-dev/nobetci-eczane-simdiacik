/**
 * One queue for every OpenStreetMap Nominatim call in this server: its usage policy allows at most
 * one request per second from an identified client, and results must be cached by the caller.
 * A lookup someone is waiting for goes before background work, so one province's long list cannot
 * hold up another visitor's search.
 */
const spacingMs = 1100;
let last = 0;
type Waiting = { urgentUntil: number; release: () => void };
const waiting: Waiting[] = [];
let pumping: ReturnType<typeof setTimeout> | undefined;

/** Claims the slot only if it is free now; interactive requests answer "busy" instead of waiting. */
export function claimNominatimSlot() {
  const elapsed = Date.now() - last;
  // A clock that went backwards (tests, NTP) must not lock the slot.
  if (elapsed >= 0 && elapsed < spacingMs) return false;
  last = Date.now();
  return true;
}

function pump() {
  pumping = undefined;
  if (!waiting.length) return;
  const wait = last + spacingMs - Date.now();
  if (wait > 0 && wait <= spacingMs) {
    pumping = setTimeout(pump, wait);
    return;
  }
  const now = Date.now();
  // Lookups a search still waits for first (in arrival order), then the rest.
  const index = Math.max(0, waiting.findIndex((item) => item.urgentUntil > now));
  const [next] = waiting.splice(index, 1);
  last = now;
  next.release();
  if (waiting.length) pumping = setTimeout(pump, spacingMs);
}

/** Waits for a free slot; `urgentUntil` is when the search that needs it gives up waiting (0: background). */
export function waitNominatimSlot(urgentUntil = 0) {
  return new Promise<void>((release) => {
    waiting.push({ urgentUntil, release });
    if (!pumping) pump();
  });
}

export const NOMINATIM_USER_AGENT = "SimdiAcik/1.0 (https://simdiacik.com)";

export async function nominatimSearch(params: Record<string, string>, urgentUntil = 0) {
  await waitNominatimSlot(urgentUntil);
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ format: "json", countrycodes: "tr", addressdetails: "1", "accept-language": "tr", ...params }).toString();
  const response = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_USER_AGENT },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Nominatim " + response.status);
  const raw: unknown = await response.json();
  return Array.isArray(raw) ? raw : [];
}
