import test from 'node:test';
import assert from 'node:assert/strict';
import {districtInLabel,officialListFor} from '../lib/official-lists';

test('closed provinces have one official page per district, and a label finds its district',()=>{
  const istanbul=officialListFor('İstanbul')!,yalova=officialListFor('Yalova')!,ordu=officialListFor('Ordu')!;
  assert.equal(istanbul.pages.length,39);assert.equal(yalova.pages.length,6);assert.equal(ordu.pages.length,19);
  for(const list of [istanbul,yalova,ordu])assert.equal(new Set(list.pages.map(page=>page.url)).size,list.pages.length);
  assert.equal(istanbul.mode,'link');assert.equal(ordu.mode,'embed');
  assert.equal(districtInLabel(istanbul,'Moda, Kadıköy, İstanbul')?.url,'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/?ilce=18');
  assert.equal(districtInLabel(istanbul,'İstanbul · İl merkezi'),undefined);
  assert.equal(districtInLabel(ordu,'Fatsa, Ordu')?.district,'Fatsa');
  assert.equal(officialListFor('Bursa'),undefined);
});
