import {requestSource} from '../source-request';
import { distanceKm, normalized, type Place, type PlacesProvider, type PlacesResult, type SearchParams } from '../places';

export const GAZIANTEP_SOURCE_URL = 'https://www.gaziantep.bel.tr/tr/nobetci-eczaneler';
const source = 'Gaziantep Büyükşehir Belediyesi';

function turkeyDay(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now);
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? whole;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
  });
}

function text(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attribute(tag: string, name: string) {
  return decodeHtml(tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? '');
}

function hasClass(tag: string, className: string) {
  return attribute(tag, 'class').split(/\s+/).includes(className);
}

function isCard(tag: string) {
  return ['flex-col', 'justify-between', 'p-4', 'rounded-2xl', 'hover:shadow-lg'].every(className => hasClass(tag, className));
}

// Public official web markup, not a documented API. Follow div depth to keep
// addresses, telephone numbers and map points inside their own pharmacy card.
function pharmacyCards(html: string) {
  const cards: string[] = [];
  let start = -1, depth = 0;
  for (const match of html.matchAll(/<div\b[^>]*>|<\/div\s*>/gi)) {
    const tag = match[0];
    if (/^<\//.test(tag)) {
      if (start >= 0 && --depth === 0) {
        cards.push(html.slice(start, match.index! + tag.length));
        start = -1;
      }
    } else if (start >= 0) {
      if (isCard(tag)) throw new Error('Gaziantep nöbet kaynağının kart sınırları değişmiş.');
      depth++;
    } else if (isCard(tag)) {
      start = match.index!;
      depth = 1;
    }
  }
  if (start >= 0) throw new Error('Gaziantep nöbet kaynağının kart sınırları değişmiş.');
  return cards;
}

function sourceDay(html: string) {
  const fields = Array.from(html.matchAll(/<input\b[^>]*>/gi), match => match[0]).filter(tag => attribute(tag, 'id') === 'datepicker' && attribute(tag, 'name') === 'date');
  if (fields.length !== 1) throw new Error('Gaziantep kaynağının nöbet tarihi doğrulanamadı.');
  const iso = attribute(fields[0], 'value');
  const date = new Date(`${iso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error('Gaziantep kaynağının nöbet tarihi geçersiz.');
  return iso;
}

function field(card: string, label: string) {
  const rows = Array.from(card.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi), match => match[1]);
  const values = rows.flatMap(row => {
    const strong = row.match(/^\s*<strong\b[^>]*>([\s\S]*?)<\/strong\s*>([\s\S]*)$/i);
    return strong && text(strong[1]) === `${label}:` ? [text(strong[2])] : [];
  });
  if (values.length !== 1) throw new Error('Gaziantep nöbet kaynağının adres biçimi değişmiş.');
  return values[0];
}

function phoneNumber(value: string) {
  if (!/^\+?[\d\s()-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, '');
  if (/^0[2-5]\d{9}$/.test(digits)) return digits;
  if (/^[2-5]\d{9}$/.test(digits)) return '0' + digits;
  if (/^90[2-5]\d{9}$/.test(digits)) return '+' + digits;
  return undefined;
}

function pointFromLinks(hrefs: string[]) {
  const points: { lat: number; lng: number }[] = [];
  for (const href of hrefs) {
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.hostname !== 'www.google.com' || !/^\/maps\/dir\/?$/.test(url.pathname)) continue;
      const query = url.searchParams.get('destination') ?? '';
      if (!/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query)) return undefined;
      const [lat, lng] = query.split(',').map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 36.5 || lat > 38 || lng < 36.2 || lng > 38.6) return undefined;
      points.push({ lat, lng });
    } catch { /* A malformed link does not provide a usable location. */ }
  }
  if (!points.length || points.some(point => point.lat !== points[0].lat || point.lng !== points[0].lng)) return undefined;
  return points[0];
}

export function parseGaziantepPharmacies(payload: unknown, params: SearchParams, now = new Date()): PlacesResult {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(params.lat) || !Number.isFinite(params.lng) || !Number.isFinite(params.radius) || params.radius <= 0) throw new Error('Gaziantep arama konumu geçersiz.');
  if (typeof payload !== 'string' || !payload || payload.length > 2_000_000) throw new Error('Gaziantep nöbet kaynağının veri biçimi değişmiş.');
  const html = payload.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const today = turkeyDay(now);
  if (sourceDay(html) !== today) throw new Error('Gaziantep kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  if (params.city && normalized(params.city) !== 'gaziantep') throw new Error('Gaziantep kaynağı bu il için doğrulanmadı.');
  const cards = pharmacyCards(html);
  if (!cards.length || cards.length > 500) throw new Error('Gaziantep nöbet kaynağının kart biçimi değişmiş.');
  const fetchedAt = now.toISOString();
  const midnight = new Date(`${today}T00:00:00+03:00`).getTime() + 86_400_000;
  const verifiedUntil = new Date(Math.min(now.getTime() + 300_000, midnight)).toISOString();
  const places: Place[] = [], ids = new Set<string>();
  let skipped = 0, missingPhone = 0;
  for (const card of cards) {
    const headings = Array.from(card.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2\s*>/gi)).filter(match => hasClass(match[0].slice(0, match[0].indexOf('>') + 1), 'text-gbb-600'));
    if (headings.length !== 1) throw new Error('Gaziantep nöbet kaynağının isim biçimi değişmiş.');
    const name = text(headings[0][1]), address = field(card, 'Adres'), district = field(card, 'İlçe');
    if (!name || name.length > 200 || !address || address.length > 1000 || !district || district.length > 100) throw new Error('Gaziantep nöbet kaynağının kart bilgileri doğrulanamadı.');
    const hrefs = Array.from(card.matchAll(/<a\b[^>]*>/gi), match => attribute(match[0], 'href'));
    const point = pointFromLinks(hrefs);
    if (!point) { skipped++; continue; }
    const phones = hrefs.filter(href => /^tel:/i.test(href)).map(href => phoneNumber(href.slice(4)));
    const phone = phones.length === 1 ? phones[0] : undefined;
    if (!phone) missingPhone++;
    const id = `gbb-${normalized(name)}-${point.lat}-${point.lng}`;
    if (ids.has(id)) continue;
    ids.add(id);
    const distance = distanceKm(params.lat, params.lng, point.lat, point.lng);
    if (distance > params.radius) continue;
    places.push({ id, name, category: 'Eczane', ...point, address: `${address} · ${district}, Gaziantep`, phone, distance, status: 'unknown', allDay: false, duty: true, dutyDate: today, verification: 'official-duty', verifiedUntil, fetchedAt, source, sourceUrl: GAZIANTEP_SOURCE_URL, hours: `Resmî nöbet tarihi: ${today.split('-').reverse().join('.')}. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.` });
  }
  if (skipped === cards.length) throw new Error('Gaziantep nöbet kayıtlarının konumları doğrulanamadı.');
  const warnings: string[] = [];
  if (skipped) warnings.push(`${skipped} Gaziantep nöbet kaydı, konumu doğrulanamadığı için gösterilmedi.`);
  if (missingPhone) warnings.push(`${missingPhone} Gaziantep nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return { places: places.sort((a, b) => a.distance - b.distance), source, fetchedAt, coverage: `${source} güncel resmî nöbet listesi`, ...(warnings.length ? { partial: true, warnings } : {}) };
}

export async function searchGaziantepPharmacies(params: SearchParams): Promise<PlacesResult> {
  const url = new URL(GAZIANTEP_SOURCE_URL);
  url.searchParams.set('date', turkeyDay(new Date()));
  const response = await requestSource(url, {headers:{Accept:'text/html'}});
  return parseGaziantepPharmacies(await response.text(), params, new Date());
}

export const gaziantepPharmacyProvider: PlacesProvider = { search: searchGaziantepPharmacies };
