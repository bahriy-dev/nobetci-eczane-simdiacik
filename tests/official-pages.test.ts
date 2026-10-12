import assert from 'node:assert/strict';
import test from 'node:test';
import type { SearchParams } from '../lib/places';
import { parseSamsunPharmacies, SAMSUN_SOURCE_URL } from '../lib/providers/samsun';
import { parseGaziantepPharmacies, GAZIANTEP_SOURCE_URL } from '../lib/providers/gaziantep';

const now = new Date('2026-10-07T13:00:00Z');
const samsunParams: SearchParams = { lat: 41.28427, lng: 36.342355, radius: 20, city: 'Samsun', query: '', category: 'Eczane', demo: false };
const gaziantepParams: SearchParams = { ...samsunParams, lat: 37.059723, lng: 37.378117, city: 'Gaziantep' };

// Reduced markup fixtures are test-only, and follow the official page card boundaries.
function samsunCard(name = 'ÖRNEK &amp; TEST ECZANESİ', point: string | null = '41.284270%2C36.342355', phone: string | null = '0362 431 01 60') {
  return `<article class="nobet-card"><div class="nobet-card-icon"><img alt=""></div><div class="nobet-card-body">
    <h3 class="nobet-card-title"><span class="nobet-card-name">${name}</span><span class="nobet-card-ilce">İLKADIM</span></h3>
    <p class="nobet-card-line"><i class="fa-solid fa-house"></i><span>İstasyon Mah. Cumhuriyet Cad. No:1</span></p>
    <p class="nobet-card-line"><i class="fa-solid fa-phone"></i>${phone === null ? '' : `<a href="tel:${phone}">${phone}</a>`}</p>
    <p class="nobet-card-line nobet-card-map">${point === null ? '' : `<a href="https://www.google.com/maps?q=${point}">Harita</a>`}</p>
  </div></article>`;
}

function samsunPage(cards = samsunCard(), notice = '07 Ekim 2026 Çarşamba · 08:30', sinopCards?: string) {
  return `<section class="nobet-section" aria-labelledby="samsunNobetBaslik"><h2 class="nobet-section-title">Samsun Bugün Nöbetçi Eczaneler</h2><div class="nobet-grid">${cards}</div></section>
    ${sinopCards === undefined ? '' : `<section class="nobet-section" aria-labelledby="sinopNobetBaslik"><h2 class="nobet-section-title">Sinop Bugün Nöbetçi Eczaneler</h2>${sinopCards}</section>`}
    <p class="nobet-sync">Son güncelleme: ${notice}</p>`;
}

function gaziantepCard(name = 'ÖRNEK &amp; TEST ECZANESİ', point: string | null = '37.059723,37.378117', phone: string | null = '0342 221 2002') {
  return `<div class="flex flex-col justify-between p-4 transition border shadow-md rounded-2xl hover:shadow-lg"><div>
    <div class="flex items-center gap-3 mb-2"><span><img alt="Eczane"></span><h2 class="text-lg font-bold text-gbb-600 leading-tight">${name}</h2></div>
    <p class="mt-1 text-sm text-gray-600"><strong>Telefon:</strong>${phone === null ? '' : `<a href="tel:${phone}">${phone}</a>`}</p>
    <p class="mt-1 text-sm text-gray-600"><strong>Adres:</strong>Eyüpoğlu Mah. Değirmen Sok. No:1/B</p>
    <p class="mt-1 text-sm text-gray-600"><strong>İlçe:</strong>ŞAHİNBEY</p>
  </div><div class="flex gap-2 mt-4"><a href="https://www.google.com/maps/search/?api=1&amp;query=Eyupoglu+Mahallesi">Harita</a>
    ${point === null ? '' : `<a href="https://www.google.com/maps/dir/?api=1&amp;destination=${point}">Yol tarifi</a>`}</div></div>`;
}

function gaziantepPage(cards = gaziantepCard(), date = '2026-10-07') {
  return `<form><input id="datepicker" type="text" name="date" value="${date}" /></form><div class="grid">${cards}</div>`;
}

test('official cards retain attribution, their own phone and coordinates without claiming opening hours', () => {
  for (const [result, url, phone] of [
    [parseSamsunPharmacies(samsunPage(), samsunParams, now), SAMSUN_SOURCE_URL, '03624310160'],
    [parseGaziantepPharmacies(gaziantepPage(), gaziantepParams, now), GAZIANTEP_SOURCE_URL, '03422212002'],
  ] as const) {
    assert.equal(result.places.length, 1);
    const place = result.places[0];
    assert.equal(place.name, 'ÖRNEK & TEST ECZANESİ');
    assert.equal(place.phone, phone);
    assert.equal(place.sourceUrl, url);
    assert.equal(place.distance, 0);
    assert.equal(place.duty, true);
    assert.equal(place.verification, 'official-duty');
    assert.equal(place.status, 'unknown');
    assert.equal(place.allDay, false);
    assert.equal(place.closes, undefined);
    assert.equal(place.verifiedUntil, '2026-10-07T13:05:00.000Z');
  }
});

test('only the current Turkey calendar date is accepted, including just after local midnight', () => {
  for (const time of [now, new Date('2026-10-06T22:00:00Z')]) {
    assert.equal(parseSamsunPharmacies(samsunPage(), samsunParams, time).places.length, 1);
    assert.equal(parseGaziantepPharmacies(gaziantepPage(), gaziantepParams, time).places.length, 1);
    assert.throws(() => parseSamsunPharmacies(samsunPage(undefined, '06 Ekim 2026 Salı · 08:30'), samsunParams, time), /güncel değil/);
    assert.throws(() => parseGaziantepPharmacies(gaziantepPage(undefined, '2026-10-06'), gaziantepParams, time), /güncel değil/);
  }
  assert.throws(() => parseSamsunPharmacies(samsunPage(undefined, '08 Ekim 2026 Perşembe · 08:30'), samsunParams, now), /güncel değil/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(undefined, '2026-10-08'), gaziantepParams, now), /güncel değil/);
});

test('invalid calendar dates and changed or ambiguous date fields fail clearly', () => {
  assert.throws(() => parseSamsunPharmacies(samsunPage(undefined, '31 Şubat 2026 Salı · 08:30'), samsunParams, now), /tarihi geçersiz/);
  assert.throws(() => parseSamsunPharmacies(samsunPage(undefined, '07 Bilinmeyen 2026 Çarşamba · 08:30'), samsunParams, now), /tarihi geçersiz/);
  assert.throws(() => parseSamsunPharmacies(samsunPage(undefined, '07 Ekim 2026 Çarşamba · 25:00'), samsunParams, now), /tarihi doğrulanamadı/);
  assert.throws(() => parseSamsunPharmacies(samsunPage().replace('nobet-sync', 'new-sync'), samsunParams, now), /biçimi değişmiş/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(undefined, '2026-02-31'), gaziantepParams, now), /tarihi geçersiz/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(undefined, '07.10.2026'), gaziantepParams, now), /tarihi geçersiz/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage() + '<input id="datepicker" name="date" value="2026-10-07">', gaziantepParams, now), /tarihi doğrulanamadı/);
});

test('verification expires at the Turkey date boundary even when five minutes have not elapsed', () => {
  const midnightSoon = new Date('2026-10-07T20:59:59Z');
  assert.equal(parseSamsunPharmacies(samsunPage(), samsunParams, midnightSoon).places[0].verifiedUntil, '2026-10-07T21:00:00.000Z');
  assert.equal(parseGaziantepPharmacies(gaziantepPage(), gaziantepParams, midnightSoon).places[0].verifiedUntil, '2026-10-07T21:00:00.000Z');
});

test('Samsun and Sinop are selected by their explicit official page sections', () => {
  const html = samsunPage(samsunCard('SAMSUN TEST'), undefined, samsunCard('SİNOP TEST', '42.021188%2C35.198167', '0368 260 29 44'));
  assert.deepEqual(parseSamsunPharmacies(html, { ...samsunParams, radius: 500 }, now).places.map(x => x.name), ['SAMSUN TEST']);
  const sinop = parseSamsunPharmacies(html, { ...samsunParams, city: 'Sinop', lat: 42.021188, lng: 35.198167 }, now);
  assert.deepEqual(sinop.places.map(x => x.name), ['SİNOP TEST']);
  assert.match(sinop.coverage!, /Sinop/);
  assert.match(sinop.places[0].address, /Sinop/);
  assert.throws(() => parseSamsunPharmacies(samsunPage(), { ...samsunParams, city: 'Sinop' }, now), /bölümü doğrulanamadı/);
  assert.throws(() => parseSamsunPharmacies(html, { ...samsunParams, city: 'Ordu' }, now), /bu il/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(), { ...gaziantepParams, city: 'Kilis' }, now), /bu il/);
});

test('a missing location skips only its own card and cannot borrow a neighbor location', () => {
  for (const [result, validName] of [
    [parseSamsunPharmacies(samsunPage(samsunCard('KONUMSUZ', null) + samsunCard('GEÇERLİ')), samsunParams, now), 'GEÇERLİ'],
    [parseGaziantepPharmacies(gaziantepPage(gaziantepCard('KONUMSUZ', null) + gaziantepCard('GEÇERLİ')), gaziantepParams, now), 'GEÇERLİ'],
  ] as const) {
    assert.deepEqual(result.places.map(x => x.name), [validName]);
    assert.equal(result.partial, true);
    assert.match(result.warnings![0], /1 .*konumu doğrulanamadığı/);
  }
});

test('a missing or unsafe phone remains absent instead of using the adjacent card phone', () => {
  for (const result of [
    parseSamsunPharmacies(samsunPage(samsunCard('TELEFONSUZ', undefined, null) + samsunCard('KOMŞU')), samsunParams, now),
    parseGaziantepPharmacies(gaziantepPage(gaziantepCard('TELEFONSUZ', undefined, null) + gaziantepCard('KOMŞU')), gaziantepParams, now),
  ]) {
    assert.equal(result.places.find(x => x.name === 'TELEFONSUZ')?.phone, undefined);
    assert.ok(result.places.find(x => x.name === 'KOMŞU')?.phone);
    assert.equal(result.partial, true);
    assert.match(result.warnings![0], /telefon/);
  }
  assert.equal(parseSamsunPharmacies(samsunPage(samsunCard(undefined, undefined, '0362 431 01 60 ext 99')), samsunParams, now).places[0].phone, undefined);
});

test('unsafe, non-numeric or mismatched map coordinates are never displayed', () => {
  for (const point of ['36.342355,41.284270', 'NaN,36.342355', '0,0', '41.284270,Infinity']) {
    assert.throws(() => parseSamsunPharmacies(samsunPage(samsunCard(undefined, point)), samsunParams, now), /konumları doğrulanamadı/);
  }
  for (const point of ['0,0', '91,37.378117', '37.059723,181', 'Gaziantep', 'NaN,37.378117']) {
    assert.throws(() => parseGaziantepPharmacies(gaziantepPage(gaziantepCard(undefined, point)), gaziantepParams, now), /konumları doğrulanamadı/);
  }
  assert.throws(() => parseSamsunPharmacies(samsunPage().replace('www.google.com/maps', 'www.google.com.evil.example/maps'), samsunParams, now), /konumları doğrulanamadı/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage().replace('https://www.google.com/maps/dir/', 'javascript://www.google.com/maps/dir/'), gaziantepParams, now), /konumları doğrulanamadı/);
  const conflicting = gaziantepCard().replace('</div></div>', '<a href="https://www.google.com/maps/dir/?destination=37.1,37.4">Other</a></div></div>');
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(conflicting), gaziantepParams, now), /konumları doğrulanamadı/);
});

test('card identity is stable, duplicates collapse and different pharmacies at one point survive', () => {
  const a = samsunCard('BİRİNCİ'), b = samsunCard('İKİNCİ');
  const first = parseSamsunPharmacies(samsunPage(a + a + b), samsunParams, now);
  const second = parseSamsunPharmacies(samsunPage(b + a), samsunParams, now);
  assert.equal(first.places.length, 2);
  assert.equal(new Set(first.places.map(x => x.id)).size, 2);
  assert.equal(first.places[0].id, second.places.find(x => x.name === first.places[0].name)?.id);
  const ga = gaziantepCard('BİRİNCİ'), gb = gaziantepCard('İKİNCİ');
  assert.equal(parseGaziantepPharmacies(gaziantepPage(ga + ga + gb), gaziantepParams, now).places.length, 2);
});

test('radius filters genuine source points and results sort by distance', () => {
  const sCards = samsunCard('UZAK', '41.384270,36.342355') + samsunCard('YAKIN');
  assert.deepEqual(parseSamsunPharmacies(samsunPage(sCards), { ...samsunParams, radius: 1 }, now).places.map(x => x.name), ['YAKIN']);
  assert.deepEqual(parseSamsunPharmacies(samsunPage(sCards), samsunParams, now).places.map(x => x.name), ['YAKIN', 'UZAK']);
  const gCards = gaziantepCard('UZAK', '37.159723,37.378117') + gaziantepCard('YAKIN');
  assert.deepEqual(parseGaziantepPharmacies(gaziantepPage(gCards), { ...gaziantepParams, radius: 1 }, now).places.map(x => x.name), ['YAKIN']);
  assert.deepEqual(parseGaziantepPharmacies(gaziantepPage(gCards), gaziantepParams, now).places.map(x => x.name), ['YAKIN', 'UZAK']);
});

test('broken card boundaries and changed required fields fail instead of mixing cards', () => {
  assert.throws(() => parseSamsunPharmacies(samsunPage(samsunCard().replace('</article>', '') + samsunCard('KOMŞU')), samsunParams, now), /kart sınırları/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(gaziantepCard().slice(0, -6) + gaziantepCard('KOMŞU')), gaziantepParams, now), /kart sınırları/);
  assert.throws(() => parseSamsunPharmacies(samsunPage().replace('nobet-card-name', 'new-name'), samsunParams, now), /biçimi değişmiş/);
  assert.throws(() => parseSamsunPharmacies(samsunPage().replace('fa-house', 'fa-new'), samsunParams, now), /adres biçimi/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage().replace('text-gbb-600', 'new-name'), gaziantepParams, now), /isim biçimi/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage().replace('Adres:', 'Yeni alan:'), gaziantepParams, now), /adres biçimi/);
  assert.throws(() => parseSamsunPharmacies(samsunPage(''), samsunParams, now), /kart biçimi/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(''), gaziantepParams, now), /kart biçimi/);
});

test('commented or scripted fake cards and dates do not count as source evidence', () => {
  const html = samsunPage() + `<script>${samsunCard('SAHTE')}</script><!-- ${samsunCard('YORUM')} -->`;
  assert.equal(parseSamsunPharmacies(html, samsunParams, now).places.length, 1);
  assert.equal(parseGaziantepPharmacies(gaziantepPage() + `<script>${gaziantepCard('SAHTE')}</script>`, gaziantepParams, now).places.length, 1);
});

test('invalid response shape, oversized responses and invalid search inputs fail', () => {
  for (const body of [null, {}, 123, '', 'x'.repeat(2_000_001)]) {
    assert.throws(() => parseSamsunPharmacies(body, samsunParams, now), /veri biçimi/);
    assert.throws(() => parseGaziantepPharmacies(body, gaziantepParams, now), /veri biçimi/);
  }
  assert.throws(() => parseSamsunPharmacies(samsunPage(), { ...samsunParams, lat: NaN }, now), /konumu geçersiz/);
  assert.throws(() => parseGaziantepPharmacies(gaziantepPage(), { ...gaziantepParams, radius: 0 }, now), /konumu geçersiz/);
  assert.throws(() => parseSamsunPharmacies(samsunPage(), samsunParams, new Date('invalid')), /konumu geçersiz/);
});
