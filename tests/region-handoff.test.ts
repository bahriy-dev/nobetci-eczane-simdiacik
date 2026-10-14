import assert from "node:assert/strict";
import test from "node:test";
import {
  handoffRegion,
  readRegionHandoff,
  consumeRegionHandoff,
} from "../lib/region-handoff";
const region = {
  city: "Ankara",
  label: "Çankaya, Ankara",
  lat: 39.9,
  lng: 32.85,
};
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
};
test("manual region survives repeated mount reads and is consumed exactly once", () => {
  const target = storage();
  handoffRegion(region, target, 1000);
  assert.deepEqual(readRegionHandoff(target, 1001), region);
  assert.deepEqual(readRegionHandoff(target, 1001), region);
  assert.deepEqual(consumeRegionHandoff(target, 1001), region);
  assert.equal(consumeRegionHandoff(target, 1001), null);
});
test("region handoff rejects expired, future and malformed values", () => {
  const target = storage();
  handoffRegion(region, target, 1000);
  assert.equal(readRegionHandoff(target, 61001), null);
  assert.equal(readRegionHandoff(target, 999), null);
  target.setItem("simdiacik-saved-region-v1", '{"lat":0}');
  assert.equal(consumeRegionHandoff(target, 1001), null);
});
