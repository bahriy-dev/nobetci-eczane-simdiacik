import test from 'node:test';
import assert from 'node:assert/strict';
import { ankaraSourceProvince, parseAnkaraPharmacies } from '../lib/providers/ankara';
import type { SearchParams } from '../lib/places';

const params: SearchParams = { lat: 39.92, lng: 32.85, radius: 10, query: '', category: 'Eczane', demo: false };
const card = (name = 'ÖRNEK &amp; ŞİFA ECZANESİ', lat = '39.9201', lng = '32.8501', phone = '05321234567') => `<div class="inline-box" data-name="ÖRNEK" data-district="Çankaya"><div class="left"><div class="text"><h4>${name}</h4><p>Örnek Mah. No:1<br>Hastane yanı<span>${phone}</span></p></div></div><div class="right"><a href="https://www.google.com/maps/search/?api=1&amp;query=${lat},${lng}">Yol tarifi</a><a href="tel:${phone}">Ara</a></div></div>`;
const payload = (html = card(), date = '2026-10-06') => ({ status: 'success', html, date, hour: 20, minute: 0, year: '2026' });

test('Ankara official card preserves names, district, phone, coordinates and unknown hours', () => {
  const result = parseAnkaraPharmacies(payload(), params, new Date('2026-10-06T17:00:00Z'));
  assert.equal(result.places.length, 1);
  const place = result.places[0];
  assert.equal(place.name, 'ÖRNEK & ŞİFA ECZANESİ');
  assert.equal(place.address, 'Örnek Mah. No:1 Hastane yanı · Çankaya');
  assert.equal(place.phone, '05321234567');
  assert.equal(place.lat, 39.9201);
  assert.equal(place.lng, 32.8501);
  assert.equal(place.status, 'unknown');
  assert.equal(place.allDay, false);
  assert.equal(place.duty, true);
  assert.equal(place.verification, 'official-duty');
  assert.equal(place.verifiedUntil, '2026-10-06T17:05:00.000Z');
  assert.equal(place.closes, undefined);
  assert.equal(place.dutyDate,'2026-10-06');
});

test('Ankara uses Turkey date, and previous duty date requires the official 08:30 notice', () => {
  const now = new Date('2026-10-06T21:15:00Z'); // 7 October, 00:15 in Turkey.
  const notice = "<p>07.10.2026 saat 08:30'a kadar 06.10.2026 tarihli nöbet listesi geçerlidir.</p>";
  const result = parseAnkaraPharmacies(payload(notice + card()), params, now);
  assert.equal(result.places[0].closes, '2026-10-07T05:30:00.000Z');
  assert.equal(result.places[0].dutyDate,'2026-10-06');
  assert.throws(() => parseAnkaraPharmacies(payload(), params, now), /tarihi güncel değil/);
  assert.throws(() => parseAnkaraPharmacies(payload(notice + card()), params, new Date('2026-10-07T05:30:00Z')), /tarihi güncel değil/);
  assert.throws(() => parseAnkaraPharmacies(payload(notice + card(), '2026-10-05'), params, now), /tarihi güncel değil/);
  assert.throws(() => parseAnkaraPharmacies(payload(card(), '2026-10-08'), params, now), /tarihi güncel değil/);
});

test('Ankara verification expires at the confirmed shift boundary', () => {
  const notice = "<p>07.10.2026 saat 08:30'a kadar 06.10.2026 tarihli nöbet listesi geçerlidir.</p>";
  const result = parseAnkaraPharmacies(payload(notice + card()), params, new Date('2026-10-07T05:28:00Z'));
  assert.equal(result.places[0].verifiedUntil, '2026-10-07T05:30:00.000Z');
});

test('Ankara filters by radius and rejects unsafe coordinates without borrowing the next card', () => {
  assert.equal(parseAnkaraPharmacies(payload(card('UZAK', '40.5', '33.1')), params, new Date('2026-10-06T17:00:00Z')).places.length, 0);
  const result = parseAnkaraPharmacies(payload(card('YANLIŞ', '32.85', '39.92') + card('GEÇERLİ')), params, new Date('2026-10-06T17:00:00Z'));
  assert.deepEqual(result.places.map(place => place.name), ['GEÇERLİ']);
  assert.equal(result.partial, true);
  assert.match(result.warnings![0], /1 Ankara nöbet kaydı/);
  assert.throws(() => parseAnkaraPharmacies(payload(card('YANLIŞ', '32.85', '39.92')), params, new Date('2026-10-06T17:00:00Z')), /konumları doğrulanamadı/);
  assert.throws(() => parseAnkaraPharmacies(payload(card().replace(/<\/div>$/, '')), params, new Date('2026-10-06T17:00:00Z')), /kart biçimi/);
});

test('Ankara fails closed on changed schema while retaining a valid official empty result', () => {
  const now = new Date('2026-10-06T17:00:00Z');
  assert.throws(() => parseAnkaraPharmacies({ status: 'error', html: card(), date: '2026-10-06' }, params, now), /veri biçimi/);
  assert.throws(() => parseAnkaraPharmacies(payload('<div>Unknown changed page</div>'), params, now), /kart biçimi/);
  assert.equal(parseAnkaraPharmacies(payload('<h4>Nöbetçi Eczane Bulunamadı</h4>'), params, now).places.length, 0);
  const result = parseAnkaraPharmacies(payload(card('ŞİFA', '39.9201', '32.8501', 'javascript:bad')), params, now);
  assert.equal(result.places[0].phone, undefined);
  assert.equal(result.partial, true);
});

test('Kırıkkale records in the Ankara chamber list belong to Kırıkkale, not Ankara', () => {
  assert.equal(ankaraSourceProvince('Yahşihan', 'Alaaddin Mah. Yahşihan/KIRIKKALE'), 'Kırıkkale');
  assert.equal(ankaraSourceProvince('Kırıkkale', 'Güzeltepe Mah. Merkez/KIRIKKALE'), 'Kırıkkale');
  assert.equal(ankaraSourceProvince('Ilcesi Belirlenmemis', 'Karşıyaka Mah. Lalahan/ ANKARA'), 'Ankara');
  assert.equal(ankaraSourceProvince('Ilcesi Belirlenmemis', 'Merkez/ KIRIKKALE'), 'Kırıkkale');
  assert.equal(ankaraSourceProvince('Çankaya', 'Kızılay Mah. Çankaya/ANKARA'), 'Ankara');
});
