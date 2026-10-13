import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {PHARMACY_CHAMBERS} from '../lib/pharmacy-sources';
import {cityGuides} from '../lib/city-guides';

test('province directory covers each province once and labels live-search coverage accurately',async()=>{
  assert.equal(PHARMACY_CHAMBERS.length,81);
  assert.equal(new Set(PHARMACY_CHAMBERS.map(province=>province.provinceId)).size,81);
  const component=await readFile(new URL('../components/province-directory.tsx',import.meta.url),'utf8');
  assert.match(component,/PHARMACY_CHAMBERS/);
  assert.match(component,/İlçe seçerek sitede ara/);
  assert.match(component,/resmî eczacı odasının nöbet listesi/);
  assert.match(component,/Konum izni gerekmez/);
  assert.equal(cityGuides.length,9);
});
