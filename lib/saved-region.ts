import type { BrowserLocation } from "./location-cache";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const savedRegionKey = "simdiacik-saved-region-v1";
export const SAVED_REGION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

/** Only a deliberately selected administrative centre is stored; no GPS accuracy or search history. */
export function readSavedRegion(
  storage?: StorageLike,
  now = Date.now(),
): BrowserLocation | null {
  try {
    const target = storage ?? globalThis.localStorage;
    const raw = target.getItem(savedRegionKey);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (
      typeof value.label !== "string" ||
      !value.label.trim() ||
      value.label.length > 300 ||
      typeof value.city !== "string" ||
      !value.city.trim() ||
      value.city.length > 100 ||
      !Number.isFinite(value.lat) ||
      value.lat < 35 ||
      value.lat > 43 ||
      !Number.isFinite(value.lng) ||
      value.lng < 25 ||
      value.lng > 45 ||
      !Number.isFinite(value.savedAt) ||
      value.savedAt > now ||
      now - value.savedAt > SAVED_REGION_MAX_AGE
    ) {
      target.removeItem(savedRegionKey);
      return null;
    }
    return {
      label: value.label,
      city: value.city,
      lat: value.lat,
      lng: value.lng,
    };
  } catch {
    try {
      (storage ?? globalThis.localStorage).removeItem(savedRegionKey);
    } catch {}
    return null;
  }
}

export function saveRegion(
  region: BrowserLocation,
  storage?: StorageLike,
  now = Date.now(),
) {
  try {
    (storage ?? globalThis.localStorage).setItem(
      savedRegionKey,
      JSON.stringify({
        label: region.label,
        city: region.city,
        lat: region.lat,
        lng: region.lng,
        savedAt: now,
      }),
    );
  } catch {}
}

export function clearSavedRegion(storage?: StorageLike) {
  try {
    (storage ?? globalThis.localStorage).removeItem(savedRegionKey);
  } catch {}
}
