import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { cityGuides, getCityGuide } from "../lib/city-guides";
import { GET as sitemapGET } from "../app/sitemap.xml/route";

test("every province has one guide page; only closed sources are marked official-only", () => {
  assert.equal(cityGuides.length, 81);
  assert.equal(
    new Set(cityGuides.map((city) => city.slug)).size,
    cityGuides.length,
  );
  assert.ok(cityGuides.every((city) => /^[a-z]+$/.test(city.slug)));
  for (const city of cityGuides)
    assert.equal(getCityGuide(city.slug)?.name, city.name);
  // Earlier guide addresses stay where they were.
  for (const slug of ["ankara", "istanbul", "izmir", "yalova", "konya"])
    assert.ok(getCityGuide(slug));
  assert.equal(getCityGuide("sanliurfa")?.name, "Şanlıurfa");
  assert.deepEqual(
    cityGuides.filter((city) => !city.live).map((city) => city.slug),
    ["amasya", "istanbul", "yalova"],
  );
});

test("city sitemap entries and static route generation use the same supported list", async () => {
  const page = await readFile(
    new URL("../app/nobetci-eczane/[city]/page.tsx", import.meta.url),
    "utf8",
  );
  const picker = await readFile(
    new URL("../components/city-guide-search.tsx", import.meta.url),
    "utf8",
  );
  const sitemap = await sitemapGET().text();
  const params = cityGuides.map((city) => ({ city: city.slug }));
  assert.match(page, /generateStaticParams/);
  for (const { city } of params)
    assert.ok(sitemap.includes(`/nobetci-eczane/${city}`));
  assert.match(page, /alternates:\s*\{\s*canonical\s*\}/);
  assert.match(picker, /RegionPicker\s+city=\{city\}/);
});
