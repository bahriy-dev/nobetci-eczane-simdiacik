import {z} from 'zod';
import {distanceKm, normalized, type Place, type PlacesProvider, type SearchParams} from '../places';

export const KAYSERI_SOURCE_URL = 'https://cbs.kayseri.bel.tr/kayseri-nobetci-eczaneler';
const mapEndpoint = 'https://cbs.kayseri.bel.tr/KentRehberi.aspx/JSNobetciEczaneler';
const apiEndpoint = 'https://acikveri.kayseri.bel.tr/api/kbb/eczane';
const source = 'Kayseri Büyükşehir Belediyesi';
const schema = z.array(z.object({
  name: z.string().trim().min(1),
  watchDate: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/),
  address: z.string().trim().min(1),
  district: z.string().trim().min(1),
  phone: z.string(),
  watchType: z.string(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})).max(2000);

function isoDay(value: string) {
  const [day, month, year] = value.split('.');
  const iso = `${year}-${month}-${day}`;
  const date = new Date(iso + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
    throw new Error('Kayseri kaynağının nöbet tarihi geçersiz.');
  }
  return iso;
}

function htmlText(value: string) {
  const entities: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
  return value.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key: string) => {
    if (!key.startsWith('#')) return entities[key.toLowerCase()] || entity;
    const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  }).replace(/\s+/g, ' ').trim();
}

function scopedElement(html: string, tag: string, id: string) {
  const expression = new RegExp(`<${tag}\\b[^>]*\\bid\\s*=\\s*(['"])${id}\\1[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi');
  const matches = [...html.matchAll(expression)];
  if (matches.length !== 1) throw new Error('Kayseri nöbet sayfasının veri biçimi değişmiş.');
  return matches[0][2];
}

function cbsRows(html: string, now: Date) {
  if (html.length > 500000) throw new Error('Kayseri nöbet sayfası beklenen boyutu aşıyor.');
  const heading = htmlText(scopedElement(html, 'span', 'ctl00_CPHContent_lblBilgiText'));
  const date = heading.match(/^(\d{2}\.\d{2}\.\d{4}) Tarihli Nöbetçi Eczaneler$/)?.[1];
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul'}).format(now);
  if (!date || isoDay(date) !== today) throw new Error('Kayseri kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  const table = scopedElement(html, 'table', 'ctl00_CPHContent_grdGirlmisNobetler');
  const rows = [];
  const ids = new Set<string>();
  for (const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)) {
    const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td\s*>/gi)].map(cell => cell[1]);
    if (!cells.length) continue;
    const id = cells[0].match(/\bhref\s*=\s*(['"])Kayseri-Kent-Rehberi\?NID=(0|[1-9]\d*)\1/i)?.[2];
    if (cells.length !== 7 || !id || ids.has(id) || rows.length >= 2000) {
      throw new Error('Kayseri nöbet sayfasının kayıtları doğrulanamadı.');
    }
    ids.add(id);
    rows.push({id, watchDate: date, name: htmlText(cells[1]), district: htmlText(cells[2]),
      watchType: htmlText(cells[4]), phone: htmlText(cells[5]), address: htmlText(cells[6])});
  }
  return rows;
}

const cbsMapSchema = z.object({d: z.array(z.object({
  Cbno: z.string().regex(/^(?:0|[1-9]\d*)$/),
  Adi: z.string().trim().min(1), Ilce: z.string().trim().min(1), Adres: z.string().trim().min(1),
  Telefon: z.string(), NobetTuruAciklama: z.string().trim().min(1),
  Geom: z.string().regex(/^-?\d+(?:\.\d+)?\|-?\d+(?:\.\d+)?$/),
})).max(2000)});

export function parseKayseriCbsPharmacies(html: string, body: unknown, params: SearchParams, now = new Date()) {
  const rows = cbsRows(html, now);
  const markers = cbsMapSchema.parse(body).d;
  const byId = new Map(markers.map(marker => [marker.Cbno, marker]));
  if (markers.length !== rows.length || byId.size !== markers.length) {
    throw new Error('Kayseri nöbet listesi ile harita kayıtları eşleşmedi.');
  }
  const sameText = (left: string, right: string) => normalized(left).replace(/\s+/g, ' ').trim() === normalized(right).replace(/\s+/g, ' ').trim();
  const datedRows = rows.map(row => {
    const marker = byId.get(row.id);
    if (!marker || !sameText(row.name, marker.Adi) || !sameText(row.district, marker.Ilce)
      || !sameText(row.address, marker.Adres) || !sameText(row.watchType, marker.NobetTuruAciklama)
      || row.phone.replace(/\D/g, '') !== marker.Telefon.replace(/\D/g, '')) {
      throw new Error('Kayseri nöbet listesi ile harita kayıtları eşleşmedi.');
    }
    // The municipality's public Leaflet UI uses Geom as longitude|latitude.
    const [longitude, latitude] = marker.Geom.split('|').map(Number);
    return {...row, longitude, latitude};
  });
  return parseKayseriPharmacies(datedRows, params, now);
}

export function parseKayseriPharmacies(body: unknown, params: SearchParams, now = new Date()) {
  const rows = schema.parse(body);
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Istanbul'}).format(now);
  const fetchedAt = now.toISOString();
  const midnight = new Date(`${today}T00:00:00+03:00`).getTime() + 86400000;
  const verifiedUntil = new Date(Math.min(now.getTime() + 300000, midnight)).toISOString();
  const places: Place[] = [];
  const ids = new Set<string>();
  let invalidCoordinates = 0, datedRows = 0, skippedDates = 0;
  for (const row of rows) {
    if (isoDay(row.watchDate) !== today) {skippedDates++; continue;}
    datedRows++;
    const lat = row.latitude, lng = row.longitude;
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < 37.4 || lat > 39.4 || lng < 34.3 || lng > 36.9) {
      invalidCoordinates++;
      continue;
    }
    const id = `kbb-${normalized(row.name)}-${lat}-${lng}`;
    if (ids.has(id)) continue;
    ids.add(id);
    const distance = distanceKm(params.lat, params.lng, lat, lng);
    if (distance > params.radius) continue;
    const digits = row.phone.replace(/\D/g, '');
    const phone = /^0[2-5]\d{9}$/.test(digits) ? digits
      : /^[2-5]\d{9}$/.test(digits) ? '0' + digits
      : /^90[2-5]\d{9}$/.test(digits) ? '+' + digits : undefined;
    places.push({id, name: row.name, category: 'Eczane', lat, lng,
      address: row.address + ' · ' + row.district, phone, distance,
      status: 'unknown', allDay: false, duty: true, dutyDate: isoDay(row.watchDate), verification: 'official-duty',
      fetchedAt, verifiedUntil, source, sourceUrl: KAYSERI_SOURCE_URL,
      hours: `Nöbet tarihi: ${row.watchDate}. ${row.watchType ? 'Kaynağın nöbet türü: ' + row.watchType + '. ' : ''}Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.`,
    });
  }
  if (rows.length && !datedRows) throw new Error('Kayseri kaynağının nöbet tarihi güncel değil. Eski kayıtlar gösterilmedi.');
  if (datedRows && invalidCoordinates === datedRows) throw new Error('Kayseri nöbet kayıtlarının konumu doğrulanamadı.');
  const warnings: string[] = [];
  if (invalidCoordinates) warnings.push(`${invalidCoordinates} kaydın konumu doğrulanamadığı için gösterilmedi.`);
  if (skippedDates) warnings.push(`${skippedDates} kayıt güncel nöbet tarihine ait olmadığı için gösterilmedi.`);
  return {places: places.sort((a, b) => a.distance - b.distance), source, fetchedAt,
    coverage: source + ' güncel nöbet listesi', ...(warnings.length ? {partial: true, warnings} : {})};
}

class KayseriAccessError extends Error {}

async function publicResponse(url: string, signal: AbortSignal, init?: RequestInit) {
  const response = await fetch(url, {...init, cache: 'no-store', signal});
  if (response.status === 401 || response.status === 403) throw new KayseriAccessError('Kayseri Belediyesi nöbet kaynağına erişim reddedildi.');
  if (!response.ok) throw new Error('Kayseri Belediyesi nöbet kaynağına ulaşılamadı.');
  return response;
}

async function limitedText(response: Response, maximumBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Kayseri Belediyesi nöbet kaynağı boş yanıt döndürdü.');
  const decoder = new TextDecoder();
  let bytes = 0, text = '';
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        throw new Error('Kayseri nöbet kaynağı beklenen boyutu aşıyor.');
      }
      text += decoder.decode(chunk.value, {stream: true});
    }
    return text + decoder.decode();
  } finally {reader.releaseLock();}
}

export const kayseriPharmacyProvider: PlacesProvider = {async search(params) {
  try {
    // These are the dated public table and the coordinate operation used by its
    // map UI. They share one six-second budget and require no keys or cookies.
    const signal = AbortSignal.timeout(6000);
    const html = await limitedText(await publicResponse(KAYSERI_SOURCE_URL, signal), 500000);
    cbsRows(html, new Date());
    const response = await publicResponse(mapEndpoint, signal, {method: 'POST',
      headers: {Accept: 'application/json', 'Content-Type': 'application/json; charset=utf-8'},
      body: JSON.stringify({xx: '1'})});
    const markers = JSON.parse(await limitedText(response, 2000000)) as unknown;
    return parseKayseriCbsPharmacies(html, markers, params);
  } catch (error) {
    if (error instanceof KayseriAccessError) throw error;
  }
  // The original, independently published municipal HTTPS dataset is a bounded
  // fallback for network or format failures; access denials are never retried.
  const response = await publicResponse(apiEndpoint, AbortSignal.timeout(3000), {headers: {Accept: 'application/json'}});
  return parseKayseriPharmacies(JSON.parse(await limitedText(response, 2000000)) as unknown, params);
}};
