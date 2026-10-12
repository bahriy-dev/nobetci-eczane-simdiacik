import test from 'node:test';
import assert from 'node:assert/strict';
import {parseQuery,filterPlaces,type Place} from '../lib/places';

const now = Date.parse('2026-10-09T10:00:00Z');
const base: Place = {id: 'torun', name: 'Torun Eczanesi', category: 'Eczane', lat: 41, lng: 29, address: 'Şehit Sokak No 24, Kadıköy', distance: 1, allDay: false, status: 'unknown', duty: true, verifiedUntil: new Date(now + 300000).toISOString(), fetchedAt: new Date(now).toISOString(), source: 'Test fixture'};
const other: Place = {...base, id: 'other', name: 'Diğer Eczanesi', address: 'Yeni Sokak, Üsküdar', distance: 2};
const filters = {category: 'Eczane' as const, radius: 10, onlyOpen: true, hasPhone: false, favoritesOnly: false, favorites: [] as string[], query: '', now};

test('queries retain pharmacy scope and extract real name and address terms', () => {
  assert.deepEqual(parseQuery('Torun Eczanesi'), {category: 'Eczane', allDay: false, terms: ['torun']});
  assert.deepEqual(parseQuery('Nöbetçi TORUN eczanesi Şehit Sokak'), {category: 'Eczane', allDay: false, terms: ['torun', 'sehit', 'sokak']});
  for (const query of ['nöbetçi veteriner', 'çilingir', 'hastane']) assert.equal(parseQuery(query).category, 'Eczane');
});

test('pharmacy words no longer suppress an actual name search', () => {
  for (const query of ['Torun', 'Torun Eczanesi', '24 saat açık Torun eczanesi', 'nöbetçi Torun']) {
    assert.deepEqual(filterPlaces([base, other], {...filters, query}).map(place => place.id), ['torun']);
  }
  assert.equal(filterPlaces([base, other], {...filters, query: 'Bulunmayan Eczanesi'}).length, 0);
});

test('generic duty and 24-hour phrases do not imply all-day opening or hide fresh duty records', () => {
  for (const query of ['nöbetçi eczane', 'gece açık eczane', '24 saat nöbetçi eczane', '7/24 eczane', '24/7 eczane', 'şu an açık eczane', 'en yakın eczane']) {
    const result = filterPlaces([base], {...filters, query});
    assert.equal(result.length, 1, query);
    assert.equal(result[0].allDay, false);
    assert.equal(result[0].status, 'unknown');
    assert.equal(parseQuery(query).allDay, false);
  }
});

test('address numbers, Turkish letters and meaningful word fragments are preserved', () => {
  assert.equal(filterPlaces([base, other], {...filters, query: 'şehit sokak 24'}).length, 1);
  assert.equal(filterPlaces([base, other], {...filters, query: 'TORUN KADIKÖY'}).length, 1);
  assert.equal(filterPlaces([base, other], {...filters, query: 'Torun Üsküdar'}).length, 0);
  const named = {...base, name: 'Açıkalın Gecekuşu Eczanesi'};
  assert.deepEqual(parseQuery('Açıkalın Gecekuşu Eczanesi').terms, ['acikalin', 'gecekusu']);
  assert.equal(filterPlaces([named], {...filters, query: 'Açıkalın Gecekuşu Eczanesi'}).length, 1);
});

test('expired, missing and invalid duty deadlines are always hidden, even with onlyOpen disabled', () => {
  for (const onlyOpen of [true, false]) {
    for (const verifiedUntil of [undefined, 'invalid date', new Date(now).toISOString(), new Date(now - 1).toISOString()]) {
      assert.equal(filterPlaces([{...base, verifiedUntil, status: 'open'}], {...filters, onlyOpen}).length, 0);
    }
    assert.equal(filterPlaces([{...base, duty: false, status: 'open'}], {...filters, onlyOpen}).length, 0);
    assert.equal(filterPlaces([base], {...filters, onlyOpen}).length, 1);
    assert.equal(filterPlaces([base], {...filters, onlyOpen, now: now + 300000}).length, 0);
  }
});

test('phone, favourites, radius and sorting operate only on fresh duty pharmacies', () => {
  const phone = {...base, phone: '02120000000'};
  assert.deepEqual(filterPlaces([other, phone], {...filters, hasPhone: true}).map(place => place.id), ['torun']);
  assert.deepEqual(filterPlaces([other, phone], {...filters, favoritesOnly: true, favorites: ['other']}).map(place => place.id), ['other']);
  assert.deepEqual(filterPlaces([other, phone], {...filters, radius: 1}).map(place => place.id), ['torun']);
  assert.deepEqual(filterPlaces([other, phone], filters).map(place => place.id), ['torun', 'other']);
  assert.equal(filterPlaces([{...base, distance: NaN}], filters).length, 0);
});

test('a non-pharmacy record cannot leak through a runtime payload', () => {
  const nonPharmacy = {...base, category: 'Veteriner'} as unknown as Place;
  assert.deepEqual(filterPlaces([nonPharmacy, base], filters).map(place => place.id), ['torun']);
});
