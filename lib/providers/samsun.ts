import { distanceKm, normalized, type Place, type PlacesProvider, type PlacesResult, type SearchParams } from '../places';
import { activeDutyDates, dutyListEnds } from '../duty-day';

export const SAMSUN_SOURCE_URL = 'https://www.samsuneczaciodasi.org.tr/nobetci-eczaneler';
const source = 'Samsun Eczacı Odası';
const months = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', middot: '·' };
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

// The source is a public rendered web page, without a documented API contract.
// Balanced element boundaries prevent a malformed card borrowing the next card's fields.
function elements(html: string, tagName: string, select: (tag: string) => boolean) {
  const result: string[] = [];
  let start = -1, depth = 0;
  for (const match of html.matchAll(new RegExp(`<${tagName}\\b[^>]*>|<\\/${tagName}\\s*>`, 'gi'))) {
    const tag = match[0];
    if (/^<\//.test(tag)) {
      if (start >= 0 && --depth === 0) {
        result.push(html.slice(start, match.index! + tag.length));
        start = -1;
      }
    } else if (start >= 0) {
      if (select(tag)) throw new Error('Samsun nöbet kaynağının kart sınırları değişmiş.');
      depth++;
    } else if (select(tag)) {
      start = match.index!;
      depth = 1;
    }
  }
  if (start >= 0) throw new Error('Samsun nöbet kaynağının kart sınırları değişmiş.');
  return result;
}

function classText(html: string, tag: string, className: string) {
  const matches = elements(html, tag, opening => hasClass(opening, className));
  if (matches.length !== 1) throw new Error('Samsun nöbet kaynağının kart biçimi değişmiş.');
  return text(matches[0]);
}

function sourceDay(html: string) {
  const notice = classText(html, 'p', 'nobet-sync');
  const match = notice.match(/^Son güncelleme:\s*(\d{1,2})\s+([\p{L}]+)\s+(\d{4})\s+[\p{L}]+\s*·\s*(\d{2}):(\d{2})$/u);
  if (!match || Number(match[4]) > 23 || Number(match[5]) > 59) throw new Error('Samsun kaynağının nöbet tarihi doğrulanamadı.');
  const month = months.indexOf(normalized(match[2])) + 1;
  const iso = `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (!month || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new Error('Samsun kaynağının nöbet tarihi geçersiz.');
  return iso;
}

function phoneNumber(value: string) {
  if (!/^\+?[\d\s()-]+$/.test(value)) return undefined;
  const digits = value.replace(/\D/g, '');
  if (/^0[2-5]\d{9}$/.test(digits)) return digits;
  if (/^[2-5]\d{9}$/.test(digits)) return '0' + digits;
  if (/^90[2-5]\d{9}$/.test(digits)) return '+' + digits;
  return undefined;
}

function pointFromLinks(hrefs: string[], province: 'Samsun' | 'Sinop') {
  const points: { lat: number; lng: number }[] = [];
  for (const href of hrefs) {
    try {
      const url = new URL(href);
      if (url.protocol !== 'https:' || url.hostname !== 'www.google.com' || !/^\/maps\/?$/.test(url.pathname)) continue;
      const query = url.searchParams.get('q') ?? '';
      if (!/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(query)) return undefined;
      const [lat, lng] = query.split(',').map(Number);
      const inBounds = province === 'Samsun'
        ? lat >= 40.4 && lat <= 42.2 && lng >= 34.9 && lng <= 37.6
        : lat >= 41.2 && lat <= 42.2 && lng >= 34 && lng <= 35.6;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBounds) return undefined;
      points.push({ lat, lng });
    } catch { /* A malformed link does not provide a usable location. */ }
  }
  if (!points.length || points.some(point => point.lat !== points[0].lat || point.lng !== points[0].lng)) return undefined;
  return points[0];
}

export function parseSamsunPharmacies(payload: unknown, params: SearchParams, now = new Date()): PlacesResult {
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(params.lat) || !Number.isFinite(params.lng) || !Number.isFinite(params.radius) || params.radius <= 0) throw new Error('Samsun arama konumu geçersiz.');
  if (typeof payload !== 'string' || !payload || payload.length > 2_000_000) throw new Error('Samsun nöbet kaynağının veri biçimi değişmiş.');
  const html = payload.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  // The page is dated by the morning its list started; that list stays current until the next handover.
  const today = sourceDay(html);
  if (!activeDutyDates(now).includes(today)) throw new Error('Samsun kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  const city = normalized(params.city ?? 'Samsun');
  if (city !== 'samsun' && city !== 'sinop') throw new Error('Samsun kaynağı bu il için doğrulanmadı.');
  const province = city === 'sinop' ? 'Sinop' : 'Samsun';
  const sectionId = city === 'sinop' ? 'sinopNobetBaslik' : 'samsunNobetBaslik';
  const sections = elements(html, 'section', tag => hasClass(tag, 'nobet-section') && attribute(tag, 'aria-labelledby') === sectionId);
  if (sections.length !== 1 || classText(sections[0], 'h2', 'nobet-section-title') !== `${province} Bugün Nöbetçi Eczaneler`) throw new Error(`${province} resmî nöbet bölümü doğrulanamadı.`);
  const cards = elements(sections[0], 'article', tag => hasClass(tag, 'nobet-card'));
  if (!cards.length || cards.length > 500) throw new Error(`${province} nöbet kaynağının kart biçimi değişmiş.`);
  const fetchedAt = now.toISOString();
  const verifiedUntil = new Date(Math.min(now.getTime() + 300_000, dutyListEnds(today))).toISOString();
  const places: Place[] = [], ids = new Set<string>();
  let skipped = 0, missingPhone = 0;
  for (const card of cards) {
    const name = classText(card, 'span', 'nobet-card-name');
    const district = classText(card, 'span', 'nobet-card-ilce');
    const addressLines = elements(card, 'p', tag => hasClass(tag, 'nobet-card-line')).filter(line => Array.from(line.matchAll(/<i\b[^>]*>/gi)).some(match => hasClass(match[0], 'fa-house')));
    if (addressLines.length !== 1) throw new Error(`${province} nöbet kaynağının adres biçimi değişmiş.`);
    const address = text(addressLines[0]);
    if (!name || name.length > 200 || !district || district.length > 100 || !address || address.length > 1000) throw new Error(`${province} nöbet kaynağının kart bilgileri doğrulanamadı.`);
    const hrefs = Array.from(card.matchAll(/<a\b[^>]*>/gi), match => attribute(match[0], 'href'));
    const point = pointFromLinks(hrefs, province);
    if (!point) { skipped++; continue; }
    const phones = hrefs.filter(href => /^tel:/i.test(href)).map(href => phoneNumber(href.slice(4)));
    const phone = phones.length === 1 ? phones[0] : undefined;
    if (!phone) missingPhone++;
    const id = `seo-${city}-${normalized(name)}-${point.lat}-${point.lng}`;
    if (ids.has(id)) continue;
    ids.add(id);
    const distance = distanceKm(params.lat, params.lng, point.lat, point.lng);
    if (distance > params.radius) continue;
    places.push({ id, name, category: 'Eczane', ...point, address: `${address} · ${district}, ${province}`, phone, distance, status: 'unknown', allDay: false, duty: true, dutyDate: today, verification: 'official-duty', verifiedUntil, fetchedAt, source, sourceUrl: SAMSUN_SOURCE_URL, hours: `Resmî nöbet tarihi: ${today.split('-').reverse().join('.')}. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.` });
  }
  if (skipped === cards.length) throw new Error(`${province} nöbet kayıtlarının konumları doğrulanamadı.`);
  const warnings: string[] = [];
  if (skipped) warnings.push(`${skipped} ${province} nöbet kaydı, konumu doğrulanamadığı için gösterilmedi.`);
  if (missingPhone) warnings.push(`${missingPhone} ${province} nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return { places: places.sort((a, b) => a.distance - b.distance), source, fetchedAt, coverage: `${province} için ${source} güncel resmî nöbet listesi`, ...(warnings.length ? { partial: true, warnings } : {}) };
}

export async function searchSamsunPharmacies(params: SearchParams): Promise<PlacesResult> {
  const response = await fetch(SAMSUN_SOURCE_URL, { headers: { Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error('Samsun Eczacı Odası nöbet kaynağına ulaşılamadı.');
  return parseSamsunPharmacies(await response.text(), params, new Date());
}

export const samsunPharmacyProvider: PlacesProvider = { search: searchSamsunPharmacies };
