import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryNames,
  distanceKm,
  safeUrl,
  type Place,
  type PlacesResult,
} from "../lib/places";
import { pharmacyProvider } from "../lib/providers/pharmacies";
import { searchPlaces } from "../lib/providers";
import { GET } from "../app/api/places/route";

const emptyResult = (): PlacesResult => ({
  places: [],
  fetchedAt: new Date().toISOString(),
  source: "Provider fixture",
});

test("the service category is exclusively pharmacy", () => {
  assert.deepEqual(categoryNames, ["Eczane"]);
  assert.equal(distanceKm(41, 29, 41, 29), 0);
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("https://example.org"), "https://example.org/");
});

test("provider dispatch always uses pharmacy without a general business provider", async () => {
  const original = pharmacyProvider.search;
  let calls = 0;
  try {
    pharmacyProvider.search = async (params) => {
      calls++;
      assert.equal(params.category, "Eczane");
      return emptyResult();
    };
    await searchPlaces({
      city: "Dispatch fixture",
      lat: 41.13,
      lng: 29.13,
      radius: 10,
      category: "Veteriner",
      query: "",
      demo: false,
    });
    assert.equal(calls, 1);
  } finally {
    pharmacyProvider.search = original;
  }
});

test("the API rejects every non-pharmacy category, including mixed repeated parameters", async () => {
  const original = pharmacyProvider.search;
  let calls = 0;
  try {
    pharmacyProvider.search = async () => {
      calls++;
      return emptyResult();
    };
    for (const category of [
      "Veteriner",
      "Acil servis",
      "Çilingir",
      "Yol yardımı",
      "Elektrikçi",
      "Tesisatçı",
      "",
    ]) {
      const query = new URLSearchParams({ lat: "41", lng: "29", category });
      const response = await GET(
        new Request("https://example.test/api/places?" + query),
      );
      assert.equal(response.status, 400, category);
    }
    for (const category of [
      "category=Veteriner&category=Eczane",
      "category=Eczane&category=Veteriner",
    ]) {
      assert.equal(
        (
          await GET(
            new Request(
              "https://example.test/api/places?lat=41&lng=29&" + category,
            ),
          )
        ).status,
        400,
      );
    }
    assert.equal(calls, 0);
  } finally {
    pharmacyProvider.search = original;
  }
});

test("the API defaults to pharmacy and never permits HTTP caching beyond a duty boundary", async () => {
  const original = pharmacyProvider.search;
  try {
    pharmacyProvider.search = async (params) => {
      assert.equal(params.category, "Eczane");
      assert.equal(params.demo, false);
      return emptyResult();
    };
    const response = await GET(
      new Request(
        "https://example.test/api/places?lat=41.14&lng=29.14&city=API%20fixture",
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = (await response.json()) as PlacesResult;
    assert.deepEqual(body.places, []);
  } finally {
    pharmacyProvider.search = original;
  }
});

test("completed cache expires at the earliest duty deadline and returns independent objects", async () => {
  const originalProvider = pharmacyProvider.search;
  const originalClock = Date.now;
  let clock = Date.parse("2026-10-09T10:00:00Z"),
    calls = 0;
  const params = {
    city: "Cache fixture",
    lat: 41.15,
    lng: 29.15,
    radius: 10,
    category: "Eczane",
    query: "",
    demo: false,
  };
  try {
    Date.now = () => clock;
    pharmacyProvider.search = async () => {
      calls++;
      const place: Place = {
        id: "fixture",
        name: "Fixture pharmacy",
        category: "Eczane",
        lat: 41.15,
        lng: 29.15,
        address: "Fixture address",
        distance: 0,
        status: "unknown",
        allDay: false,
        duty: true,
        verifiedUntil: new Date(clock + 5000).toISOString(),
        fetchedAt: new Date(clock).toISOString(),
        source: "Provider fixture",
      };
      return {
        places: [place],
        fetchedAt: place.fetchedAt,
        source: place.source,
      };
    };
    const first = await searchPlaces(params);
    first.places[0].name = "Changed by caller";
    clock += 1000;
    const second = await searchPlaces(params);
    assert.equal(second.cached, true);
    assert.equal(second.places[0].name, "Fixture pharmacy");
    assert.equal(calls, 1);
    clock += 4000;
    assert.equal((await searchPlaces(params)).cached, undefined);
    assert.equal(calls, 2);
  } finally {
    pharmacyProvider.search = originalProvider;
    Date.now = originalClock;
  }
});

test("server responses omit expired and undated provider records before caching", async () => {
  const original = pharmacyProvider.search;
  const now = Date.now();
  const place: Place = {
    id: "valid",
    name: "Fixture pharmacy",
    category: "Eczane",
    lat: 41.16,
    lng: 29.16,
    address: "Fixture address",
    distance: 0,
    status: "unknown",
    allDay: false,
    duty: true,
    verifiedUntil: new Date(now + 60000).toISOString(),
    fetchedAt: new Date(now).toISOString(),
    source: "Provider fixture",
  };
  try {
    pharmacyProvider.search = async () => ({
      places: [
        place,
        {
          ...place,
          id: "expired",
          verifiedUntil: new Date(now - 1).toISOString(),
        },
        { ...place, id: "undated", verifiedUntil: undefined },
      ],
      fetchedAt: place.fetchedAt,
      source: place.source,
    });
    const result = await searchPlaces({
      city: "Freshness fixture",
      lat: 41.16,
      lng: 29.16,
      radius: 10,
      category: "Eczane",
      query: "",
      demo: false,
    });
    assert.deepEqual(
      result.places.map((item) => item.id),
      ["valid"],
    );
    assert.equal(result.partial, true);
    assert.match(result.warnings?.[0] ?? "", /^2 kaydın/);
  } finally {
    pharmacyProvider.search = original;
  }
});

test("unsupported provinces are not attributed to neighbouring official sources", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new Error(
        "An unsupported province must not request another province source",
      );
    };
    for (const [city, lat, lng] of [
      ["Sakarya", 40.78, 30.4],
      ["Hatay", 36.2, 36.16],
    ] as const) {
      const result = await pharmacyProvider.search({
        city,
        lat,
        lng,
        radius: 10,
        query: "",
        demo: false,
        category: "Eczane",
      });
      assert.equal(result.places.length, 0);
      assert.ok(result.coverage?.includes("henüz yok"));
    }
  } finally {
    globalThis.fetch = original;
  }
});

test("the API accepts the 20 km quick filter and rejects values beyond its bound", async () => {
  const original = pharmacyProvider.search;
  try {
    pharmacyProvider.search = async (params) => {
      assert.equal(params.radius, 20);
      return emptyResult();
    };
    const url =
      "https://example.test/api/places?lat=41.17&lng=29.17&city=Radius%20fixture&radius=";
    assert.equal((await GET(new Request(url + "20"))).status, 200);
    assert.equal((await GET(new Request(url + "20.1"))).status, 400);
  } finally {
    pharmacyProvider.search = original;
  }
});

test("Istanbul overview uses a fixed province scope without a 20 km cutoff", async () => {
  const original = pharmacyProvider.search;
  let calls = 0;
  try {
    pharmacyProvider.search = async (params) => {
      calls++;
      assert.equal(params.city, "İstanbul");
      assert.equal(params.lat, 41.0082);
      assert.ok(params.radius > 200);
      return emptyResult();
    };
    const response = await GET(
      new Request(
        "https://example.test/api/places?lat=41&lng=29&radius=2&city=" +
          encodeURIComponent("İstanbul") +
          "&scope=province",
      ),
    );
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
  } finally {
    pharmacyProvider.search = original;
  }
});
test("province overview cannot broaden arbitrary city or invalid scope searches", async () => {
  for (const query of [
    "city=Ankara&scope=province",
    "city=Istanbul&scope=world",
    "city=Ankara&scope=all",
  ]) {
    assert.equal(
      (
        await GET(
          new Request("https://example.test/api/places?lat=41&lng=29&" + query),
        )
      ).status,
      400,
    );
  }
});
