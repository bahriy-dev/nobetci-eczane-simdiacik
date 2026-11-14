import { deduplicatePharmacies, isFreshDuty, type Place, type PlacesResult } from "./places";

// Server-rendered city lists use the same freshness and identity checks as API results.
export function getCityDutyPlaces(
  duty: PlacesResult | null,
  now = Date.now(),
): Place[] {
  return deduplicatePharmacies(
    (duty?.places ?? []).filter((place) => isFreshDuty(place, now)),
  ).slice(0, 150);
}
