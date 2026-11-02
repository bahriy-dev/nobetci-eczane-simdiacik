/**
 * One queue for every OpenStreetMap Nominatim call in this server: its usage policy allows at most
 * one request per second from an identified client, and results must be cached by the caller.
 */
const spacingMs = 1100;
let last = 0;
let queue: Promise<void> = Promise.resolve();

/** Claims the slot only if it is free now; interactive requests answer "busy" instead of waiting. */
export function claimNominatimSlot() {
  const elapsed = Date.now() - last;
  // A clock that went backwards (tests, NTP) must not lock the slot.
  if (elapsed >= 0 && elapsed < spacingMs) return false;
  last = Date.now();
  return true;
}

/** Waits for the next free slot; background lookups use this. */
export function waitNominatimSlot() {
  const next = queue.then(async () => {
    const wait = last + spacingMs - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    last = Date.now();
  });
  queue = next.catch(() => {});
  return next;
}

export const NOMINATIM_USER_AGENT = "SimdiAcik/1.0 (https://simdiacik.com)";

export async function nominatimSearch(params: Record<string, string>) {
  await waitNominatimSlot();
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
