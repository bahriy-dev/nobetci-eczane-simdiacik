import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {cityGuides,getCityGuide} from '../lib/city-guides';
import {GET as sitemapGET} from '../app/sitemap.xml/route';

test('SEO city pages exist only for provinces with a direct, supported duty provider',()=>{
  assert.equal(cityGuides.length,9);
  assert.equal(new Set(cityGuides.map(city=>city.slug)).size,cityGuides.length);
  assert.ok(cityGuides.every(city=>city.source.kind!=='directory'));
  for(const city of cityGuides)assert.equal(getCityGuide(city.slug)?.name,city.name);
  assert.equal(getCityGuide('adana'),undefined);
});

test('city sitemap entries and static route generation use the same supported list',async()=>{
  const page=await readFile(new URL('../app/nobetci-eczane/[city]/page.tsx',import.meta.url),'utf8');
  const picker=await readFile(new URL('../components/city-guide-search.tsx',import.meta.url),'utf8');
  const sitemap=await sitemapGET().text();
  const params=cityGuides.map(city=>({city:city.slug}));
  assert.match(page,/generateStaticParams/);
  for(const {city} of params)assert.ok(sitemap.includes(`/nobetci-eczane/${city}`));
  assert.match(page,/alternates:\{canonical\}/);
  assert.match(picker,/RegionPicker city=\{city\}/);
});
