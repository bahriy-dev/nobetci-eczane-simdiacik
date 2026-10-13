import {
  parseResolvedLocation,
  validTurkeyCoordinates,
} from "@/lib/location-validation";
import {
  createRequestRateLimiter,
  rateLimitResponse,
  requestRateLimitKey,
} from "@/lib/request-rate-limit";
const cache = new Map<string, { value: unknown; expires: number }>();
let lastRequest = 0;
const allowLocation = createRequestRateLimiter({ limit: 12, windowMs: 60_000 });
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    q = params.get("q")?.trim(),
    lat = Number(params.get("lat")),
    lng = Number(params.get("lng"));
  const reverse = params.has("lat") && params.has("lng");
  if (
    reverse
      ? !validTurkeyCoordinates(lat, lng)
      : !q || q.length < 3 || q.length > 150
  )
    return Response.json(
      { error: "Geçerli bir konum veya en az 3 karakterlik yer adı gir." },
      { status: 400 },
    );
  const rate = allowLocation(requestRateLimitKey(request));
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);
  const key = reverse ? `${lat.toFixed(4)},${lng.toFixed(4)}` : q!;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now())
    return Response.json(cached.value, {
      headers: { "Cache-Control": "no-store" },
    });
  if (Date.now() - lastRequest < 1100)
    return Response.json(
      { error: "Konum hizmeti meşgul. Biraz sonra tekrar dene." },
      {
        status: 429,
        headers: { "Retry-After": "2", "Cache-Control": "no-store" },
      },
    );
  lastRequest = Date.now();
  try {
    const url = new URL(
      "https://nominatim.openstreetmap.org/" + (reverse ? "reverse" : "search"),
    );
    url.search = new URLSearchParams(
      reverse
        ? {
            lat: String(lat),
            lon: String(lng),
            format: "json",
            addressdetails: "1",
            "accept-language": "tr",
          }
        : {
            q: q!,
            format: "json",
            limit: "5",
            countrycodes: "tr",
            addressdetails: "1",
            "accept-language": "tr",
          },
    ).toString();
    const response = await fetch(url, {
      headers: { "User-Agent": "SimdiAcik/1.0 (https://simdiacik.com)" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error();
    const raw: unknown = await response.json();
    const result = reverse
      ? parseResolvedLocation(raw)
      : Array.isArray(raw)
        ? raw.map(parseResolvedLocation).filter((v) => v !== undefined)
        : undefined;
    if (result === undefined) throw new Error("Invalid location response");
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { value: result, expires: Date.now() + 300000 });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      {
        error:
          "Konum araması şu an kullanılamıyor. İl ve ilçe seçerek devam edebilirsin.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
