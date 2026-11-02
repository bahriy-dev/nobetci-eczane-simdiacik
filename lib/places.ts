export const categoryNames = ["Eczane"] as const;
export type Category = (typeof categoryNames)[number];
export type Place = {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  address: string;
  phone?: string;
  website?: string;
  hours?: string;
  status: "open" | "closed" | "unknown";
  /** Confirmed duty ending time, only when the source explicitly supplies it. */
  closes?: string;
  /** Confirmed duty start, set only while that start is still ahead (evening lists seen by day). */
  opens?: string;
  /** Set when the source gave no map point and the location was placed from the address. */
  locationEstimate?: "pharmacy" | "neighbourhood";
  allDay: boolean;
  distance: number;
  rating?: number;
  reviewCount?: number;
  price?: number;
  photo?: string;
  reviews?: { author: string; rating: number; text: string; date: string }[];
  source: string;
  sourceUrl?: string;
  fetchedAt: string;
  demo?: boolean;
  duty?: boolean;
  dutyDate?: string;
  /** Validation deadline for this record; never displayed as the pharmacy's opening hours. */
  verifiedUntil?: string;
  verification?:
    "official-duty" | "provider-duty" | "provider-hours" | "listed-only";
};
export type SearchParams = {
  lat: number;
  lng: number;
  radius: number;
  query: string;
  category: string;
  demo: boolean;
  city?: string;
};
export type PlacesResult = {
  places: Place[];
  fetchedAt: string;
  source: string;
  cached?: boolean;
  partial?: boolean;
  warnings?: string[];
  coverage?: string;
  coverageStatus?: "supported" | "unsupported";
};
export interface PlacesProvider {
  search(params: SearchParams): Promise<PlacesResult>;
}
export function distanceKm(a: number, b: number, c: number, d: number) {
  const r = Math.PI / 180;
  const h =
    Math.sin(((c - a) * r) / 2) ** 2 +
    Math.cos(a * r) * Math.cos(c * r) * Math.sin(((d - b) * r) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export const normalized = (x: string) =>
  x
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
const genericPharmacyTerms = new Set([
  "eczane",
  "eczanesi",
  "eczaneler",
  "eczaneleri",
  "eczanesini",
  "eczanesine",
  "eczanesinde",
  "eczanesinden",
  "eczaci",
  "nobetci",
  "nobet",
  "acik",
  "simdi",
  "bugun",
  "gece",
  "yakinimdaki",
  "yakinimda",
]);
export function parseQuery(query: string) {
  const text = normalized(query).replace(
    /\b(?:24\s*saat|7\s*\/\s*24|24\s*\/\s*7|su\s+an(?:da)?|en\s+yakin)\b/g,
    " ",
  );
  const terms = (text.match(/[\p{L}\p{N}]+/gu) || []).filter(
    (term) => !genericPharmacyTerms.has(term),
  );
  return { category: "Eczane" as const, allDay: false, terms };
}
export function isFreshDuty(place: Place, now: number) {
  return (
    place.category === "Eczane" &&
    place.duty === true &&
    Number.isFinite(now) &&
    Boolean(place.verifiedUntil) &&
    Date.parse(place.verifiedUntil!) > now
  );
}
/** Conflicting identities fail closed; exact duplicates never create repeated cards or pins. */
export function deduplicatePharmacies(places: Place[]): Place[] {
  const groups = new Map<string, Place[]>();
  const idGroups = new Map<string, Place[]>();
  const identity = (p: Place) =>
    normalized(p.name + "|" + p.address).replace(/[^\p{L}\p{N}|]/gu, "");
  for (const p of places) {
    const key = identity(p);
    groups.set(key, [...(groups.get(key) || []), p]);
    idGroups.set(p.id, [...(idGroups.get(p.id) || []), p]);
  }
  const conflictedIds = new Set(
    [...idGroups]
      .filter(([, rows]) => rows.some((p) => identity(p) !== identity(rows[0])))
      .map(([id]) => id),
  );
  const result: Place[] = [];
  for (const rows of groups.values()) {
    const first = rows[0];
    if (
      new Set(rows.map((p) => p.phone).filter(Boolean)).size > 1 ||
      rows.some(
        (p) =>
          conflictedIds.has(p.id) ||
          distanceKm(first.lat, first.lng, p.lat, p.lng) > 0.1 ||
          first.dutyDate !== p.dutyDate,
      )
    )
      continue;
    const verifiedUntil = rows
      .map((p) => p.verifiedUntil)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
    result.push({ ...first, verifiedUntil });
  }
  return result;
}

export function parsePlacesResult(
  value: unknown,
  now = Date.now(),
): PlacesResult {
  if (!value || typeof value !== "object")
    throw new Error("Güncel listeye ulaşılamadı.");
  const data = value as PlacesResult;
  if (
    !Array.isArray(data.places) ||
    data.places.length > 1000 ||
    typeof data.source !== "string" ||
    typeof data.fetchedAt !== "string" ||
    !Number.isFinite(Date.parse(data.fetchedAt)) ||
    Date.parse(data.fetchedAt) > now + 60_000 ||
    data.places.some(
      (p) =>
        !p ||
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        typeof p.address !== "string" ||
        !p.address.trim() ||
        p.category !== "Eczane" ||
        p.duty !== true ||
        !Number.isFinite(p.lat) ||
        p.lat < 35 ||
        p.lat > 43 ||
        !Number.isFinite(p.lng) ||
        p.lng < 25 ||
        p.lng > 45 ||
        !Number.isFinite(p.distance) ||
        p.distance < 0 ||
        typeof p.source !== "string" ||
        typeof p.fetchedAt !== "string" ||
        !Number.isFinite(Date.parse(p.fetchedAt)) ||
        Date.parse(p.fetchedAt) > now + 60_000 ||
        !p.verifiedUntil ||
        !Number.isFinite(Date.parse(p.verifiedUntil)) ||
        (p.phone !== undefined &&
          (typeof p.phone !== "string" ||
            !/^\+?[\d\s()-]{7,25}$/.test(p.phone) ||
            p.phone.replace(/\D/g, "").length < 7)) ||
        (p.hours !== undefined && typeof p.hours !== "string") ||
        (p.sourceUrl !== undefined && typeof p.sourceUrl !== "string"),
    )
  )
    throw new Error("Güncel listeye ulaşılamadı.");
  const places = deduplicatePharmacies(data.places);
  return {
    ...data,
    places,
    ...(places.length < data.places.length ? { partial: true } : {}),
  };
}
type PlaceFilters = {
  category: Category;
  radius: number;
  onlyOpen: boolean;
  hasPhone: boolean;
  favoritesOnly: boolean;
  favorites: string[];
  query: string;
  now: number;
};
export function filterPlaces(places: Place[], filters: PlaceFilters) {
  const parsed = parseQuery(filters.query);
  let list = places.filter(
    (p) =>
      p.category === filters.category &&
      isFreshDuty(p, filters.now) &&
      Number.isFinite(p.distance) &&
      p.distance >= 0 &&
      p.distance <= filters.radius &&
      (!filters.hasPhone || Boolean(p.phone)) &&
      (!filters.favoritesOnly || filters.favorites.includes(p.id)),
  );
  if (parsed.terms.length)
    list = list.filter((p) => {
      const text = normalized(p.name + " " + p.address);
      return parsed.terms.every((term) => text.includes(term));
    });
  return deduplicatePharmacies(list).sort(
    (a, b) => a.distance - b.distance || a.id.localeCompare(b.id),
  );
}
export const safeUrl = (url?: string) => {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return ["https:", "http:"].includes(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
};
