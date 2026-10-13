import test from "node:test";
import assert from "node:assert/strict";
import {
  readSavedRegion,
  saveRegion,
  clearSavedRegion,
  SAVED_REGION_MAX_AGE,
  savedRegionKey,
} from "../lib/saved-region";
import { readSearchFilters, searchFilterUrl } from "../lib/search-state";
import {
  deduplicatePharmacies,
  filterPlaces,
  parsePlacesResult,
  type Place,
} from "../lib/places";
import { mapTileConfig } from "../lib/map-tiles";
import { resolveTheme } from "../lib/browser-preferences";

test("theme uses system preference unless a valid explicit preference exists", () => {
  assert.equal(resolveTheme(null, true), true);
  assert.equal(resolveTheme("light", true), false);
  assert.equal(resolveTheme("dark", false), true);
  assert.equal(resolveTheme("invalid", true), true);
});

const now = Date.parse("2026-10-13T12:00:00Z");
const row = (overrides: Partial<Place> = {}): Place => ({
  id: "a",
  name: "Test Eczanesi",
  category: "Eczane",
  address: "Test Mahallesi 10",
  lat: 41,
  lng: 29,
  status: "unknown",
  allDay: false,
  distance: 0.5,
  source: "Test",
  fetchedAt: new Date(now).toISOString(),
  duty: true,
  dutyDate: "2026-10-13",
  verifiedUntil: new Date(now + 60_000).toISOString(),
  ...overrides,
});

test("saved region is optional, expires after 30 days and can be removed without retaining GPS accuracy", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  assert.equal(readSavedRegion(storage, now), null);
  saveRegion(
    {
      label: "Kadıköy, İstanbul",
      city: "İstanbul",
      lat: 41,
      lng: 29,
      accuracy: 123,
    },
    storage,
    now,
  );
  assert.equal(readSavedRegion(storage, now)?.accuracy, undefined);
  assert.equal(readSavedRegion(storage, now + SAVED_REGION_MAX_AGE + 1), null);
  assert.equal(data.has(savedRegionKey), false);
  saveRegion(
    { label: "Kadıköy, İstanbul", city: "İstanbul", lat: 41, lng: 29 },
    storage,
    now,
  );
  clearSavedRegion(storage);
  assert.equal(data.size, 0);
});

test("malformed, future and out-of-country saved regions are not restored", () => {
  for (const raw of [
    "broken",
    "{}",
    JSON.stringify({ label: "x", city: "x", lat: 1, lng: 29, savedAt: now }),
    JSON.stringify({
      label: "x",
      city: "x",
      lat: 41,
      lng: 29,
      savedAt: now + 1,
    }),
  ]) {
    assert.equal(
      readSavedRegion(
        { getItem: () => raw, setItem: () => {}, removeItem: () => {} },
        now,
      ),
      null,
    );
  }
});

test("filter URLs validate values, retain a deliberately shared area and add no GPS coordinates", () => {
  assert.deepEqual(readSearchFilters("?radius=999&sort=invalid&phone=true"), {
    query: "",
    radius: "10",
    hasPhone: false,
    sort: "distance",
  });
  const filters = readSearchFilters("?q=Cankaya&radius=5&sort=name&phone=1");
  assert.equal(
    searchFilterUrl("https://simdiacik.com/?utm_source=test", filters),
    "/?utm_source=test&q=Cankaya&radius=5&phone=1&sort=name",
  );
  const shared = searchFilterUrl(
    "https://simdiacik.com/?lat=41&lng=29",
    filters,
  );
  assert.match(shared, /lat=41&lng=29/);
  assert.equal(readSearchFilters("?q=" + "a".repeat(200)).query.length, 150);
});

test("duplicates retain the earliest validity while conflicting identities or phone records are hidden", () => {
  const first = row();
  const duplicate = row({
    id: "b",
    verifiedUntil: new Date(now + 30_000).toISOString(),
  });
  const clean = deduplicatePharmacies([first, duplicate]);
  assert.equal(clean.length, 1);
  assert.equal(clean[0].verifiedUntil, duplicate.verifiedUntil);
  assert.equal(
    deduplicatePharmacies([first, row({ address: "A different address" })])
      .length,
    0,
  );
  assert.equal(
    deduplicatePharmacies([
      row({ phone: "02121111111" }),
      row({ id: "b", phone: "02122222222" }),
    ]).length,
    0,
  );
  assert.equal(
    deduplicatePharmacies([first, row({ id: "b", lat: 41.2 })]).length,
    0,
  );
});

test("equal-distance pharmacies have a stable order and expired rows stay hidden", () => {
  const filters = {
    category: "Eczane" as const,
    radius: 10,
    onlyOpen: true,
    hasPhone: false,
    favoritesOnly: false,
    favorites: [],
    query: "",
    now,
  };
  const list = filterPlaces(
    [
      row({ id: "b", address: "Address B" }),
      row({ id: "a", address: "Address A" }),
      row({
        id: "old",
        address: "Address C",
        verifiedUntil: new Date(now).toISOString(),
      }),
    ],
    filters,
  );
  assert.deepEqual(
    list.map((p) => p.id),
    ["a", "b"],
  );
});

test("HTTP-success envelopes still require safe pharmacy records at runtime", () => {
  const envelope = {
    places: [row()],
    source: "Test",
    fetchedAt: new Date(now).toISOString(),
  };
  assert.equal(parsePlacesResult(envelope, now).places.length, 1);
  for (const value of [
    {},
    { ...envelope, fetchedAt: new Date(now + 60_001).toISOString() },
    { ...envelope, places: [row({ lat: NaN })] },
    { ...envelope, places: [row({ address: "" })] },
    {
      ...envelope,
      places: [row({ category: "Veteriner" as Place["category"] })],
    },
  ])
    assert.throws(() => parsePlacesResult(value, now));
  assert.equal(
    parsePlacesResult({ ...envelope, places: [row(), row({ id: "b" })] }, now)
      .partial,
    true,
  );
});

test("map provider configuration uses HTTPS and cannot inject attribution HTML", () => {
  assert.match(mapTileConfig().url, /^https:\/\/tile.openstreetmap.org/);
  assert.throws(() =>
    mapTileConfig(
      "http://example.test/{z}/{x}/{y}.png",
      "Test",
      "https://example.test",
    ),
  );
  assert.throws(() => mapTileConfig("https://example.test/{z}/{x}/{y}.png"));
  assert.match(
    mapTileConfig(
      "https://example.test/{z}/{x}/{y}.png",
      "<script>",
      "https://example.test",
    ).attribution,
    /&lt;script&gt;/,
  );
});
