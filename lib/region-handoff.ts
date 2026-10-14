import type { BrowserLocation } from "./location-cache";
import { readSavedRegion, saveRegion, clearSavedRegion } from "./saved-region";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
/** One-use tab-local handoff; manual selection must not require another geocoder. */
export function handoffRegion(
  region: BrowserLocation,
  storage?: StorageLike,
  now = Date.now(),
) {
  try {
    const target = storage ?? globalThis.sessionStorage;
    saveRegion(region, target, now);
    const saved = readRegionHandoff(target, now);
    return (
      saved?.city === region.city &&
      saved.lat === region.lat &&
      saved.lng === region.lng
    );
  } catch {
    return false;
  }
}
export function readRegionHandoff(storage?: StorageLike, now = Date.now()) {
  try {
    const target = storage ?? globalThis.sessionStorage;
    const raw = target.getItem("simdiacik-saved-region-v1");
    const region = readSavedRegion(target, now);
    if (!raw || !region) return null;
    const savedAt = JSON.parse(raw).savedAt;
    if (now - savedAt > 60_000) {
      clearSavedRegion(target);
      return null;
    }
    return region;
  } catch {
    return null;
  }
}

export function consumeRegionHandoff(storage?: StorageLike, now = Date.now()) {
  const region = readRegionHandoff(storage, now);
  try {
    clearSavedRegion(storage ?? globalThis.sessionStorage);
  } catch {}
  return region;
}
