import test from 'node:test';
import assert from 'node:assert/strict';
import {getPharmacySource, PHARMACY_CHAMBERS, PHARMACY_SOURCE_PROVENANCE, VERIFIED_PHARMACY_DUTY_SOURCES} from '../lib/pharmacy-sources';

test('the official TEB snapshot contains all 81 provinces and 60 responsible chambers', () => {
  assert.equal(PHARMACY_CHAMBERS.length, 81);
  assert.deepEqual(PHARMACY_CHAMBERS.map(row => row.provinceId), Array.from({length: 81}, (_, index) => index + 1));
  assert.equal(new Set(PHARMACY_CHAMBERS.map(row => row.province)).size, 81);
  assert.equal(new Set(PHARMACY_CHAMBERS.map(row => row.chamberId)).size, 60);
  assert.equal(PHARMACY_SOURCE_PROVENANCE.sourceUrl, 'https://teb.org.tr/odalar');
  assert.match(PHARMACY_SOURCE_PROVENANCE.retrievedAt, /^\d{4}-\d{2}-\d{2}$/);
  for (const row of PHARMACY_CHAMBERS) {
    assert.notEqual(getPharmacySource(row.province).kind, 'directory', row.province);
    assert.equal(new URL(row.url).protocol, 'https:');
  }
});

test('Turkish, uppercase and unaccented province names resolve to the same official source', () => {
  const variants = [
    ['İstanbul', 'İSTANBUL', 'Istanbul', ' istanbul '],
    ['İzmir', 'İZMİR', 'IZMIR', 'izmir'],
    ['Iğdır', 'IĞDIR', 'igdir', 'ığdır'],
    ['Şanlıurfa', 'ŞANLIURFA', 'sanliurfa', 'şanlıurfa'],
    ['Çanakkale', 'ÇANAKKALE', 'canakkale'],
  ];
  for (const [province, ...names] of variants) {
    for (const name of names) assert.deepEqual(getPharmacySource(name), getPharmacySource(province));
  }
});

test('current source links and the verified Konya and Gaziantep overrides are preserved', () => {
  for (const [city, url] of [
    ['İstanbul', 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/'],
    ['Yalova', 'https://www.istanbuleczaciodasi.org.tr/nobetci-eczane/'],
    ['Ankara', 'https://www.aeo.org.tr/nobetci-eczaneler'],
    ['İzmir', 'https://www.izmir.bel.tr/tr/NobetciEczane/27'],
    ['Kayseri', 'https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler'],
    ['Konya', 'https://www.konyanobetcieczaneleri.com'],
    ['Gaziantep', 'https://www.gaziantepeo.org.tr/nobet-karti'],
  ]) {
    assert.equal(getPharmacySource(city).url, url);
    assert.equal(getPharmacySource(city).kind, 'duty-list');
  }
  assert.equal(getPharmacySource('Samsun').url, getPharmacySource('Sinop').url);
  assert.equal(getPharmacySource('Sinop').kind, 'duty-list');
  assert.match(getPharmacySource('Sinop').name, /Sinop/);
});

test('a shared chamber does not grant an unverified neighbouring duty-list override', () => {
  for (const [province, chamber] of [
    ['Kilis', 'Gaziantep Eczacı Odası'],
    ['Bilecik', 'Eskişehir Eczacı Odası'],
    ['Artvin', 'Trabzon Eczacı Odası'],
    ['Gümüşhane', 'Trabzon Eczacı Odası'],
    ['Kırıkkale', 'Ankara Eczacı Odası'],
  ]) {
    const source = getPharmacySource(province);
    assert.equal(source.name, chamber);
    assert.equal(source.kind, 'chamber');
  }
  assert.deepEqual(getPharmacySource('Rize'), {name: 'Rize Eczacı Odası', url: 'https://rizeeczaciodasi.org.tr/', kind: 'chamber'});
});

test('unknown, missing and district-only values use the public TEB directory', () => {
  for (const city of [undefined, null, '', '   ', 'Kadıköy', 'İstanbul Kadıköy', 'javascript:alert(1)']) {
    assert.deepEqual(getPharmacySource(city), {name: 'Türk Eczacıları Birliği · Eczacı odaları', url: 'https://teb.org.tr/odalar', kind: 'directory'});
  }
});

test('verified links have province-specific evidence and returned objects cannot change later lookups', () => {
  assert.equal(new Set(VERIFIED_PHARMACY_DUTY_SOURCES.map(row => row.provinceId)).size, VERIFIED_PHARMACY_DUTY_SOURCES.length);
  for (const row of VERIFIED_PHARMACY_DUTY_SOURCES) {
    assert.ok(PHARMACY_CHAMBERS.some(province => province.provinceId === row.provinceId));
    assert.equal(new URL(row.url).protocol, 'https:');
    assert.equal(new URL(row.evidenceUrl).protocol, 'https:');
    assert.match(row.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
  }
  const source = getPharmacySource('Ankara');
  source.url = 'https://example.com/';
  assert.equal(getPharmacySource('Ankara').url, 'https://www.aeo.org.tr/nobetci-eczaneler');
});
