import { distanceKm, normalized } from "./places";
import { nominatimSearch } from "./nominatim";

/**
 * Locates a duty pharmacy whose source lists only an address. An OpenStreetMap pharmacy of the same
 * name counts only when its street or neighbourhood agrees with the source address; otherwise the
 * neighbourhood's own point is used. Anything vaguer is rejected rather than guessed.
 */
export type EstimatedPoint = { lat: number; lng: number; precision: "pharmacy" | "neighbourhood" };
export type PharmacyAddress = { name: string; address: string; province: string; district?: string; center: [number, number] };

type Hit = { lat: number; lng: number; kind: string; text: string; area: string };
const okNumber = (value: unknown) => typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value);
function hits(raw: unknown[], province: string): Hit[] {
  const wanted = normalized(province).trim();
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const address = (row.address && typeof row.address === "object" ? row.address : {}) as Record<string, unknown>;
    const text = typeof row.display_name === "string" ? row.display_name : "";
    if (!okNumber(row.lat) || !okNumber(row.lon)) return [];
    // Nominatim names the province in "province" (or "state" for some records).
    const region = normalized(String(address.province ?? address.state ?? "")).trim();
    if (region !== wanted && !normalized(text).includes(wanted)) return [];
    const area = [address.town, address.county, address.city_district, address.district, address.city].filter(Boolean).map(String).join(" ");
    return [{ lat: Number(row.lat), lng: Number(row.lon), kind: `${row.class}/${row.type}`, text, area }];
  });
}

const words = (value: string) => normalized(value).replace(/[^\p{L}\d ]/gu, " ").replace(/\s+/g, " ").trim();
// Directions written before a neighbourhood ("…ACİL KARŞISI ZAFER MAH.") are not part of its name.
const directions = new Set(["karsisi", "karsi", "yani", "arkasi", "civari", "uzeri", "ilerisi", "alti", "bitisigi", "hastanesi", "acil", "devlet", "girisi", "sitesi", "no", "ve"]);
const kinds: [RegExp, string][] = [[/^(?:cad(?:desi)?|cd)$/, "Caddesi"], [/^(?:sok(?:ak|agi)?|sk)$/, "Sokak"], [/^(?:bulv(?:ari)?|blv)$/, "Bulvarı"]];
/** "CEVHERİZADE MAH. EMEKSİZ CD. ÖZDEN SOK." → neighbourhood "cevherizade", streets ["emeksiz caddesi", "ozden sokak"]. */
export function addressParts(address: string) {
  const tokens = words(address.replace(/[.,/:]/g, " ")).split(" ").filter(Boolean);
  let neighbourhood: string | undefined;
  const streets: string[] = [];
  const isMah = (token: string) => /^(?:mah(?:allesi)?|mh)$/.test(token);
  const kindOf = (token: string) => kinds.find(([pattern]) => pattern.test(token))?.[1];
  // Up to three name words before a marker, stopping at directions, numbers or another marker.
  const nameBefore = (index: number) => {
    const name: string[] = [];
    for (let i = index - 1; i >= 0 && name.length < 3; i--) {
      const word = tokens[i];
      if (directions.has(word) || /\d/.test(word) || isMah(word) || kindOf(word)) break;
      name.unshift(word);
    }
    return name.join(" ");
  };
  tokens.forEach((token, index) => {
    if (isMah(token) && !neighbourhood) neighbourhood = nameBefore(index) || undefined;
    const kind = kindOf(token), name = kind ? nameBefore(index) : "";
    if (kind && name.length > 2) streets.push(`${name} ${kind.toLocaleLowerCase("tr-TR")}`);
  });
  return { neighbourhood, streets };
}

const nearCentre = (hit: Hit, request: PharmacyAddress) =>
  request.district && normalized(request.district) !== "merkez"
    ? normalized(hit.area).includes(normalized(request.district))
    : distanceKm(request.center[0], request.center[1], hit.lat, hit.lng) <= 25;

export async function estimatePharmacyPoint(request: PharmacyAddress): Promise<EstimatedPoint | undefined> {
  const { neighbourhood, streets } = addressParts(request.address);
  const title = request.name.toLocaleLowerCase("tr-TR").replace(/(^|\s)\p{L}/gu, (c) => c.toLocaleUpperCase("tr-TR"));
  const named = hits(await nominatimSearch({ q: `${title}, ${request.province}`, limit: "5" }), request.province);
  // The street's last name word is its most distinctive part ("vali konağı" → "konagi").
  const streetNames = streets.map((street) => street.split(" ").at(-2)!).filter((word) => word.length > 2);
  const agrees = (hit: Hit) => {
    const place = words(hit.text);
    return (neighbourhood !== undefined && place.includes(neighbourhood)) || streetNames.some((street) => place.includes(street));
  };
  const pharmacy = named.find((hit) => hit.kind === "amenity/pharmacy" && agrees(hit) && nearCentre(hit, request));
  if (pharmacy) return { lat: pharmacy.lat, lng: pharmacy.lng, precision: "pharmacy" };
  // Without a neighbourhood, the street itself near the centre. (OSM rarely names Turkish streets as the
  // sources write them, so with a neighbourhood that query is skipped to keep lookups few.)
  if (!neighbourhood) {
    if (!streets[0]) return undefined;
    const road = hits(await nominatimSearch({ q: `${streets[0]}, ${request.province}`, limit: "3" }), request.province)
      .filter((hit) => hit.kind.startsWith("highway/") && nearCentre(hit, request));
    // A street name found in two places is no answer.
    if (road.length !== 1) return undefined;
    return { lat: road[0].lat, lng: road[0].lng, precision: "neighbourhood" };
  }
  const area = request.district && normalized(request.district) !== "merkez" ? request.district + ", " : "";
  // Only the neighbourhood itself or a point that lies in it ("…, Yeni Mahalle, Tokat"), never a namesake school.
  const lookup = async (suffix: string) => hits(await nominatimSearch({ q: `${neighbourhood} ${suffix}, ${area}${request.province}`, limit: "5" }), request.province)
    .filter((hit) => words(hit.text).includes(`${neighbourhood} mahalle`) && nearCentre(hit, request));
  // OSM writes both "Yeni Mahallesi" and "Yeni Mahalle".
  let places = await lookup("Mahallesi");
  if (!places.length) places = await lookup("Mahalle");
  // Two neighbourhoods of that name (e.g. in both central districts) leave the place unknown.
  if (!places.length || places.some((hit) => distanceKm(hit.lat, hit.lng, places[0].lat, places[0].lng) > 1.5)) return undefined;
  return { lat: places[0].lat, lng: places[0].lng, precision: "neighbourhood" };
}

// Addresses rarely move: a found point is kept a week, a miss a day, so each address is looked up rarely.
const found = 7 * 86_400_000, missed = 86_400_000;
const cache = new Map<string, { point?: EstimatedPoint; expires: number }>();
const pending = new Map<string, Promise<EstimatedPoint | undefined>>();
export async function cachedPharmacyPoint(request: PharmacyAddress) {
  const key = [request.province, request.district ?? "", request.name, request.address].map((v) => normalized(v)).join("|");
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.point;
  const running = pending.get(key);
  if (running) return running;
  const lookup = estimatePharmacyPoint(request)
    .then((point) => {
      if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
      cache.set(key, { point, expires: Date.now() + (point ? found : missed) });
      return point;
    })
    .finally(() => pending.delete(key));
  pending.set(key, lookup);
  return lookup;
}
