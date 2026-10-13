import {
  isFreshDuty,
  deduplicatePharmacies,
  type SearchParams,
  type PlacesResult,
} from "../places";
import { pharmacyProvider } from "./pharmacies";
// Only completed values may outlive a Cloudflare Worker request.
const cache = new Map<string, { value: PlacesResult; expires: number }>();
const copyResult = (value: PlacesResult): PlacesResult => ({
  ...value,
  places: value.places.map((place) => ({ ...place })),
  ...(value.warnings ? { warnings: [...value.warnings] } : {}),
});
export async function searchPlaces(
  params: SearchParams,
): Promise<PlacesResult> {
  const key = JSON.stringify([
    params.lat.toFixed(4),
    params.lng.toFixed(4),
    params.radius,
    params.city,
  ]);
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expires > now)
    return { ...copyResult(cached.value), cached: true };
  const result = await pharmacyProvider.search({
    ...params,
    category: "Eczane",
  });
  const completedAt = Date.now();
  const places = deduplicatePharmacies(
    result.places.filter((place) => isFreshDuty(place, completedAt)),
  );
  const omitted = result.places.length - places.length;
  const value: PlacesResult = {
    ...result,
    places,
    ...(omitted
      ? {
          partial: true,
          warnings: [
            ...(result.warnings || []),
            `${omitted} kaydın nöbet geçerliliği doğrulanamadığı için gösterilmedi.`,
          ],
        }
      : {}),
  };
  const expires = Math.min(
    completedAt + 60000,
    ...places.map((place) => Date.parse(place.verifiedUntil!)),
  );
  if (cache.size >= 80) cache.delete(cache.keys().next().value!);
  cache.set(key, { value: copyResult(value), expires });
  return copyResult(value);
}
