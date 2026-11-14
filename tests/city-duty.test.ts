import assert from "node:assert/strict";
import test from "node:test";
import { getCityDutyPlaces } from "../lib/city-duty";
import type { Place, PlacesResult } from "../lib/places";

const now = Date.parse("2026-11-14T12:00:00Z");
const place = (overrides: Partial<Place> = {}): Place => ({
  id: "one", name: "Örnek Eczanesi", address: "Örnek Sokak 1",
  category: "Eczane", lat: 41, lng: 29, distance: 1,
  status: "unknown", allDay: false, duty: true,
  source: "Fixture", fetchedAt: new Date(now).toISOString(),
  verifiedUntil: new Date(now + 60_000).toISOString(),
  ...overrides,
});
const result = (places: Place[]): PlacesResult => ({
  places, source: "Fixture", fetchedAt: new Date(now).toISOString(),
});

test("city list excludes expired, unverified and non-duty pharmacies", () => {
  const valid = place();
  assert.deepEqual(getCityDutyPlaces(result([
    valid,
    place({ id: "expired", verifiedUntil: new Date(now).toISOString() }),
    place({ id: "missing", verifiedUntil: undefined }),
    place({ id: "invalid", verifiedUntil: "invalid" }),
    place({ id: "not-duty", duty: false }),
  ]), now), [valid]);
  assert.deepEqual(getCityDutyPlaces(null, now), []);
});

test("city list collapses duplicates and rejects conflicting identities", () => {
  const valid = place();
  assert.deepEqual(getCityDutyPlaces(result([valid, { ...valid }]), now), [valid]);
  assert.deepEqual(getCityDutyPlaces(result([
    valid, place({ address: "Başka Sokak 2" }),
  ]), now), []);
});

test("city list applies the display limit after validation without changing provider records", () => {
  const places = [
    place({ id: "expired", verifiedUntil: new Date(now).toISOString() }),
    ...Array.from({ length: 151 }, (_, i) => place({
      id: String(i), name: `Eczane ${i}`, address: `Sokak ${i}`,
    })),
  ];
  const before = structuredClone(places);
  const selected = getCityDutyPlaces(result(places), now);
  assert.equal(selected.length, 150);
  assert.equal(selected[0].id, "0");
  assert.equal(selected[149].id, "149");
  assert.deepEqual(places, before);
});
