const baseUrl = (process.env.SOURCE_MONITOR_BASE_URL || 'https://simdiacik.com').replace(/\/$/, '');
const cities = [
  ['İstanbul', 41.0082, 28.9784],
  ['Yalova', 40.6550, 29.2769],
  ['Ankara', 39.9334, 32.8597],
  ['İzmir', 38.4237, 27.1428],
  ['Kayseri', 38.7312, 35.4787],
  ['Konya', 37.8746, 32.4932],
  ['Samsun', 41.2867, 36.3300],
  ['Sinop', 42.0231, 35.1531],
  ['Gaziantep', 37.0662, 37.3833],
];
const maxAgeMs = 15 * 60_000;
let failed = false;

for (const [city, lat, lng] of cities) {
  const query = new URLSearchParams({lat: String(lat), lng: String(lng), radius: '1', city, category: 'Eczane'});
  try {
    const started=Date.now();
    const response = await fetch(`${baseUrl}/api/places?${query}`, {
      headers: {Accept: 'application/json'},
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json();
    const fetchedAt = Date.parse(body?.fetchedAt || '');
    const current = Number.isFinite(fetchedAt) && fetchedAt <= Date.now() + 60_000 && Date.now() - fetchedAt <= maxAgeMs;
    const valid = response.ok && body?.coverageStatus !== 'unsupported'
      && Array.isArray(body?.places) && typeof body?.source === 'string' && current
      && body.places.every(p=>p.category==='Eczane'&&p.duty===true&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Date.parse(p.verifiedUntil)>Date.now());
    if (!valid) {
      failed = true;
      console.error(`${city}: başarısız (HTTP ${response.status}, kaynak: ${body?.source || 'yok'}, güncel yanıt: ${current ? 'evet' : 'hayır'})`);
      continue;
    }
    console.log(`${city}: OK (${body.places.length} eczane kaydı, ${body.source}, ${Date.now()-started} ms)`);
  } catch (error) {
    failed = true;
    console.error(`${city}: istek başarısız (${error instanceof Error ? error.name : 'bilinmeyen hata'})`);
  }
}

if (failed) process.exitCode = 1;
