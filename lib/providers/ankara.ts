import { distanceKm, normalized, type Place, type PlacesProvider, type PlacesResult, type SearchParams } from '../places';

export const ANKARA_SOURCE_URL = 'https://www.aeo.org.tr/nobetci-eczaneler';
const source = 'Ankara Eczacı Odası';
const dayMs = 86_400_000;
// The Ankara chamber also publishes the Kırıkkale list; each record is assigned to its own province.
const kirikkaleDistricts = new Set(['bahsili', 'baliseyh', 'celebi', 'delice', 'karakecili', 'keskin', 'kirikkale', 'sulakyurt', 'yahsihan']);
export function ankaraSourceProvince(district: string, address: string): 'Ankara' | 'Kırıkkale' {
  if (kirikkaleDistricts.has(normalized(district).trim())) return 'Kırıkkale';
  return /\/\s*kirikkale\b/.test(normalized(address)) ? 'Kırıkkale' : 'Ankara';
}
const unknownDistrict = (district: string) => normalized(district).replace(/\s+/g, ' ').trim() === 'ilcesi belirlenmemis';

function turkeyDate(now: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now);
}

function dottedDate(date: string) {
  return date.split('-').reverse().join('.');
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith('#')) {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    }
    return entities[entity.toLowerCase()] ?? whole;
  });
}

function plainText(value: string) {
  return decodeHtml(value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'));
  return match ? decodeHtml(match[2]) : undefined;
}

// The public page returns rendered cards, rather than a documented data API.
// Track div depth so a missing field cannot borrow data from the following card.
function pharmacyCards(html: string) {
  const cards: string[] = [];
  let start = -1;
  let depth = 0;
  for (const match of html.matchAll(/<div\b[^>]*>|<\/div\s*>/gi)) {
    const tag = match[0];
    if (/^<\/div/i.test(tag)) {
      if (start >= 0 && --depth === 0) {
        cards.push(html.slice(start, match.index! + tag.length));
        start = -1;
      }
    } else if (start >= 0) {
      depth++;
    } else if (attribute(tag, 'class')?.split(/\s+/).includes('inline-box')) {
      start = match.index!;
      depth = 1;
    }
  }
  if (start >= 0) throw new Error('Ankara nöbet listesinin kart biçimi değişmiş.');
  return cards;
}

function phoneNumber(value?: string) {
  if (!value || !/^\+?[\d\s()-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, '');
  if (/^0[2-5]\d{9}$/.test(digits)) return digits;
  if (/^[2-5]\d{9}$/.test(digits)) return '0' + digits;
  if (/^90[2-5]\d{9}$/.test(digits)) return '+' + digits;
  if (/^0090[2-5]\d{9}$/.test(digits)) return '+' + digits.slice(2);
  return undefined;
}

function coordinates(card: string) {
  for (const match of card.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(match[0], 'href');
    if (!href) continue;
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.hostname !== 'www.google.com' || !/^\/maps\/search\/?$/.test(url.pathname)) continue;
      const query = url.searchParams.get('query') ?? '';
      if (!/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query)) continue;
      const [lat, lng] = query.split(',').map(Number);
      // Reject swapped and out-of-region coordinates from changed source markup.
      if (Number.isFinite(lat) && Number.isFinite(lng) && lat > 38 && lat < 41.2 && lng > 30.5 && lng < 34.5) return { lat, lng };
    } catch { /* A malformed external link is not a usable location. */ }
  }
  return undefined;
}

export function parseAnkaraPharmacies(payload: unknown, params: SearchParams, now = new Date()): PlacesResult {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(params.lat) || !Number.isFinite(params.lng) || !Number.isFinite(params.radius) || params.radius <= 0) throw new Error('Ankara arama konumu geçersiz.');
  if (!payload || typeof payload !== 'object') throw new Error('Ankara nöbet listesi doğrulanamadı.');
  const data = payload as Record<string, unknown>;
  if (data.status !== 'success' || typeof data.html !== 'string' || data.html.length > 2_000_000 || typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isInteger(data.hour) || Number(data.hour) < 0 || Number(data.hour) > 23 || !Number.isInteger(data.minute) || Number(data.minute) < 0 || Number(data.minute) > 59) throw new Error('Ankara nöbet kaynağının veri biçimi değişmiş.');

  const today = turkeyDate(now);
  const yesterday = turkeyDate(new Date(now.getTime() - dayMs));
  const cutoff = new Date(`${today}T08:30:00+03:00`);
  const tomorrowMidnight = new Date(new Date(`${today}T00:00:00+03:00`).getTime() + dayMs);
  let dutyEnd: Date | undefined;
  if (data.date !== today) {
    // The official endpoint can return the preceding evening's list until 08:30.
    // Accept that date only when the response explicitly confirms this interval.
    const notice = plainText(data.html).match(/(\d{2}\.\d{2}\.\d{4})\s+saat\s+08:30['’]a\s+kadar\s+(\d{2}\.\d{2}\.\d{4})\s+tarihli\s+nöbet\s+listesi\s+geçerlidir\./i);
    if (data.date !== yesterday || now >= cutoff || notice?.[1] !== dottedDate(today) || notice?.[2] !== dottedDate(yesterday)) throw new Error('Ankara kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
    dutyEnd = cutoff;
  }

  const fetchedAt = now.toISOString();
  const verifiedUntil = new Date(Math.min(now.getTime() + 5 * 60_000, (dutyEnd ?? tomorrowMidnight).getTime())).toISOString();
  const cards = pharmacyCards(data.html);
  if (!cards.length && !plainText(data.html).includes('Nöbetçi Eczane Bulunamadı')) throw new Error('Ankara nöbet kaynağının kart biçimi değişmiş.');
  const province = normalized(params.city ?? 'Ankara').trim() === 'kirikkale' ? 'Kırıkkale' : 'Ankara';
  const places: Place[] = [];
  let skipped = 0;
  let missingPhone = 0;
  const ids = new Set<string>();
  for (const card of cards) {
    const openingTag = card.slice(0, card.indexOf('>') + 1);
    const name = plainText(card.match(/<h4\b[^>]*>([\s\S]*?)<\/h4\s*>/i)?.[1] ?? '');
    const addressHtml = card.match(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/i)?.[1] ?? '';
    const address = plainText(addressHtml.replace(/<span\b[^>]*>[\s\S]*?<\/span\s*>/gi, ' '));
    const district = attribute(openingTag, 'data-district')?.trim();
    const point = coordinates(card);
    if (!name || name.length > 200 || !address || address.length > 1000 || !district || district.length > 100 || !point) { skipped++; continue; }
    if (ankaraSourceProvince(district, address) !== province) continue;
    const phoneHref = Array.from(card.matchAll(/<a\b[^>]*>/gi)).map(match => attribute(match[0], 'href')).find(href => href?.startsWith('tel:'));
    const phone = phoneNumber(phoneHref?.slice(4));
    if (!phone) missingPhone++;
    const id = `aeo-${point.lat}-${point.lng}-${normalized(name)}`;
    if (ids.has(id)) continue;
    ids.add(id);
    const distance = distanceKm(params.lat, params.lng, point.lat, point.lng);
    if (distance > params.radius) continue;
    places.push({ id, name, category: 'Eczane', ...point, address: unknownDistrict(district) || normalized(address).includes(normalized(district)) ? address : `${address} · ${district}`, phone, status: 'unknown', allDay: false, duty: true, dutyDate: data.date, verification: 'official-duty', verifiedUntil, closes: dutyEnd?.toISOString(), hours: dutyEnd ? `Resmî listeye göre nöbet ${dottedDate(today)} 08:30'a kadar geçerli. Gitmeden önce telefonla teyit et.` : `Resmî nöbet tarihi: ${dottedDate(data.date)}. Gitmeden önce telefonla teyit et.`, distance, source, sourceUrl: ANKARA_SOURCE_URL, fetchedAt });
  }
  if (cards.length && skipped === cards.length) throw new Error('Ankara nöbet kayıtlarının adres ve konumları doğrulanamadı.');
  const warnings: string[] = [];
  if (skipped) warnings.push(`${skipped} Ankara nöbet kaydı, adres veya konum doğrulanamadığı için gösterilmedi.`);
  if (missingPhone) warnings.push(`${missingPhone} Ankara nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return { places: places.sort((a, b) => a.distance - b.distance), source, fetchedAt, coverage: `${source} güncel resmî nöbet listesi`, ...(warnings.length ? { partial: true, warnings } : {}) };
}

export async function searchAnkaraPharmacies(params: SearchParams): Promise<PlacesResult> {
  const requestedAt = new Date();
  const response = await fetch(`https://www.aeo.org.tr/getPharmacies/${turkeyDate(requestedAt)}`, { cache: 'no-store', signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Ankara Eczacı Odası nöbet kaynağına ulaşılamadı.');
  // The official endpoint labels its JSON body as text/html.
  return parseAnkaraPharmacies(await response.json(), params, new Date());
}

export const ankaraPharmacyProvider: PlacesProvider = { search: searchAnkaraPharmacies };
