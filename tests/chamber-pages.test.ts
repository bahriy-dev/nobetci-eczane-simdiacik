import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePage,parseChamberPage,searchChamberPage,CHAMBER_PAGES} from '../lib/providers/chamber-pages';
import {pharmacyProvider} from '../lib/providers/pharmacies';
import {turkeyDay} from '../lib/duty-day';
const params=(city:string,lat:number,lng:number)=>({city,lat,lng,radius:2000,category:'Eczane',query:'',demo:false});
const denizli=(interval='01.11.2026 08:30 / 02.11.2026 08:30 nöbetçidir.',heading='02 Kasım 2026 DENİZLİ\'DE NÖBETÇİ ECZANELER')=>`<h2>${heading}</h2>
<div class="nobetci"><h4>ADALET ECZANESİ</h4><p>- MERKEZEFENDİ / ADALET MAH. 10142 SOK. NO:11</p><p>${interval}</p>
<a href="tel:02582571707">0258 257 17 07</a><a href="https://www.google.com/maps?q=37.78215,29.025288">Harita</a></div>`;
const afterMidnight=new Date('2026-11-01T22:00:00Z'); // 01:00 in Türkiye

test('records carry their own duty interval; the overnight list is shown until it ends',()=>{
  const result=parseChamberPage(denizli(),params('Denizli',37.78,29.09),afterMidnight);
  assert.equal(result.places.length,1);
  const [place]=result.places;
  assert.equal(place.name,'ADALET ECZANESİ');assert.equal(place.phone,'02582571707');
  assert.equal(place.closes,'2026-11-02T05:30:00.000Z');assert.match(place.address,/Adalet Mah|ADALET MAH/);assert.match(place.address,/Merkezefendi/);
  assert.equal(place.sourceUrl,CHAMBER_PAGES.denizli.url);
  assert.throws(()=>parseChamberPage(denizli(),params('Denizli',37.78,29.09),new Date('2026-11-02T05:30:00Z')),/göstermiyor/);
});

test('a list published before its start is not shown as the current duty',()=>{
  const upcoming=denizli("!!! 03.11.2026 09:00'A KADAR AÇIK !!!");
  assert.throws(()=>parseChamberPage(upcoming,params('Denizli',37.78,29.09),new Date('2026-11-02T00:30:00Z')),/göstermiyor/);
  assert.equal(parseChamberPage(upcoming,params('Denizli',37.78,29.09),new Date('2026-11-02T10:00:00Z')).places.length,1);
  assert.throws(()=>parseChamberPage(denizli('','30 Ekim 2026 NÖBETÇİ ECZANELER'),params('Denizli',37.78,29.09),afterMidnight),/güncel değil/);
});

test('an evening shift seen by day is shown with its start; a later day\'s shift is not',()=>{
  const evening=denizli('02.11.2026 18:30 / 03.11.2026 08:30 nöbetçidir.');
  const [place]=parseChamberPage(evening,params('Denizli',37.78,29.09),new Date('2026-11-02T06:54:00Z')).places; // 09:54
  assert.equal(place.opens,'2026-11-02T15:30:00.000Z');assert.equal(place.closes,'2026-11-03T05:30:00.000Z');
  assert.equal(parseChamberPage(evening,params('Denizli',37.78,29.09),new Date('2026-11-02T16:00:00Z')).places[0].opens,undefined);
  assert.throws(()=>parseChamberPage(evening,params('Denizli',37.78,29.09),new Date('2026-11-02T00:30:00Z')),/göstermiyor/); // 03:30
});

const izmir=(date='2026-11-02',clock="<p>SAAT 23:59'A KADAR NÖBETÇİDİR</p>")=>`<form><input type="date" name="tarih1" value="${date}" class="form-control"></form>
<h4>YILDIZ ECZANESİ - ALTINDAĞ</h4><a href="tel:02324676727">0232</a><p>* (24:00'DEN SONRA- ÇAMDİBİ )</p>${clock}<p>ZAFER MAH. YENER CAD. NO:25/B</p>
<a href="https://www.google.com/maps?q=38.422392,27.205131">Harita</a>`;
test('the platform date picker dates a page, and a clock-only end belongs to that duty day',()=>{
  const at=(iso:string)=>parseChamberPage(izmir(),params('İzmir',38.42,27.14),new Date(iso));
  const [place]=at('2026-11-02T18:00:00Z').places; // 21:00
  assert.equal(place.name,'YILDIZ ECZANESİ');assert.equal(place.address,'ZAFER MAH. YENER CAD. NO:25/B · Altındağ');
  assert.equal(place.closes,'2026-11-02T20:59:00.000Z');
  assert.throws(()=>at('2026-11-02T21:30:00Z'),/göstermiyor/); // 00:30, its shift is over
  assert.throws(()=>parseChamberPage(izmir('2026-10-30'),params('İzmir',38.42,27.14),new Date('2026-11-02T18:00:00Z')),/güncel değil/);
});

test('an empty İzmir municipal feed falls back to the chamber page',async()=>{
  const original=globalThis.fetch,previous=process.env.ECZANELER_API_KEY;
  try{
    delete process.env.ECZANELER_API_KEY;
    globalThis.fetch=async input=>{const url=String(input);if(url.includes('openapi.izmir'))return Response.json([]);if(url.includes('turkiyeapi'))return Response.json({},{status:500});return new Response(izmir(turkeyDay(Date.now()),''),{headers:{'content-type':'text/html; charset=utf-8'}});};
    const result=await pharmacyProvider.search(params('İzmir',38.42,27.14));
    assert.equal(result.source,'İzmir Eczacı Odası');assert.equal(result.places.length,1);
  }finally{globalThis.fetch=original;if(previous!==undefined)process.env.ECZANELER_API_KEY=previous;}
});

test('district headings and addresses inside map links are kept',()=>{
  const html=`<div class="ilcebas"><span>Kepez</span></div><a href="tel:0242 237 72 34">ÖZNUR ECZANESİ</a><br/><a href="tel:0242 237 72 34">0(242) 237-72-34</a>
<a href="https://maps.google.com/maps?q=36.9341,30.6912">Varsak Mah. 12. Sok. No:4</a>`;
  const [place]=parseChamberPage(html,params('Antalya',36.88,30.7),afterMidnight,['Kepez','Muratpaşa']).places;
  assert.equal(place.name,'ÖZNUR ECZANESİ');assert.equal(place.phone,'02422377234');assert.equal(place.address,'Varsak Mah. 12. Sok. No:4 · Kepez');
});

test('a chamber page serving two provinces gives each record to the nearer province',()=>{
  const html=`<h4>ZEYNEP ECZANESİ</h4><p>Merkez Mah. No:1</p><a href="tel:03722511098">x</a><a href="https://www.google.com/maps?q=41.451,31.785">h</a>
<h4>AMASRA ECZANESİ</h4><p>Kum Mah. No:2</p><a href="tel:03783151010">x</a><a href="https://www.google.com/maps?q=41.746,32.386">h</a>`;
  assert.deepEqual(parseChamberPage(html,params('Zonguldak',41.45,31.79),afterMidnight).places.map(p=>p.name),['ZEYNEP ECZANESİ']);
  assert.deepEqual(parseChamberPage(html,params('Bartın',41.63,32.34),afterMidnight).places.map(p=>p.name),['AMASRA ECZANESİ']);
});

test('a shared page gives each record to the province of its district, not just the nearest centre',()=>{
  // Başkale (Van) lies nearer Hakkari's centre; "MERKEZ" exists in both, so distance decides it.
  const html=`<h4>BAŞKALE ECZANESİ</h4><p>BAŞKALE</p><p>Yeni Mah. No:3</p><a href="tel:04326113040">x</a><a href="https://www.google.com/maps?q=38.04536,44.01512">h</a>
<h4>UMUT ECZANESİ</h4><p>MERKEZ</p><p>Cumhuriyet Cad. No:5</p><a href="tel:04382110101">x</a><a href="https://www.google.com/maps?q=37.573514,43.732111">h</a>
<h4>CADDE ECZANESİ</h4><p>İPEKYOLU</p><p>Beşyol No:1</p><a href="tel:04322230606">x</a><a href="https://www.google.com/maps?q=38.503421,43.399394">h</a>`;
  const van=['İpekyolu','Tuşba','Başkale'],hakkari=['Merkez','Yüksekova','Şemdinli'],bitlis=['Merkez','Tatvan'];
  const names=(city:string,own:string[],others:string[])=>parseChamberPage(html,params(city,38,43),afterMidnight,own,others).places.map(p=>p.name).sort();
  assert.deepEqual(names('Van',van,[...bitlis,...hakkari]),['BAŞKALE ECZANESİ','CADDE ECZANESİ']);
  assert.deepEqual(names('Hakkari',hakkari,[...van,...bitlis]),['UMUT ECZANESİ']);
  const [place]=parseChamberPage(html,params('Hakkari',37.57,43.74),afterMidnight,hakkari,[...van,...bitlis]).places;
  assert.equal(place.address,'Cumhuriyet Cad. No:5 · Merkez');
});

test('"DISTRICT/PROVINCE" headings and district menus do not carry one province\'s label into another',()=>{
  const html=`<select><option>MERKEZ</option><option>SULTANHANI</option></select>
<h3>SULTANHANI BUGÜN NÖBETÇİ ECZANELER</h3><h4>UMUT ECZANESİ</h4><p>İstikamet Mah. No:61</p><a href="tel:03822213030">x</a><a href="https://www.google.com/maps?q=38.2484,33.5468">h</a>
<h3>MERKEZ/KIRŞEHİR BUGÜN NÖBETÇİ ECZANELER</h3><h4>MERVE ECZANESİ</h4><p>Kervansaray Mah. 2019 Sok.</p><a href="tel:03862134040">x</a><a href="https://www.google.com/maps?q=39.1478,34.1611">h</a>`;
  const aksaray=['Merkez','Sultanhanı','Ağaçören'],kirsehir=['Merkez','Kaman','Mucur'];
  assert.deepEqual(parseChamberPage(html,params('Aksaray',38.37,34.03),afterMidnight,aksaray,kirsehir).places.map(p=>p.name),['UMUT ECZANESİ']);
  const [place]=parseChamberPage(html,params('Kırşehir',39.15,34.16),afterMidnight,kirsehir,aksaray).places;
  assert.equal(place.name,'MERVE ECZANESİ');assert.match(place.address,/· Merkez$/);
});

test('windows-1254 pages decode Turkish letters correctly',()=>{
  const bytes=new Uint8Array([...'<h4>G'].map(c=>c.charCodeAt(0)).concat([0xdc],[...'NE'].map(c=>c.charCodeAt(0)),[0xde],[...' ECZANES'].map(c=>c.charCodeAt(0)),[0xdd],[...'</h4>'].map(c=>c.charCodeAt(0))));
  assert.match(decodePage(bytes.buffer,'text/html; charset=windows-1254'),/GÜNEŞ ECZANESİ/);
});

test('provinces with a chamber page use it, and a refusal pauses that page instead of retrying',async()=>{
  const original=globalThis.fetch,previous=process.env.ECZANELER_API_KEY;let calls=0;
  try{
    delete process.env.ECZANELER_API_KEY;
    globalThis.fetch=async input=>{const url=String(input);if(url.includes('turkiyeapi'))return Response.json({},{status:500});calls++;return new Response('Forbidden',{status:403});};
    await assert.rejects(()=>pharmacyProvider.search(params('Niğde',37.97,34.68)));
    await assert.rejects(()=>searchChamberPage(params('Niğde',37.97,34.68)));
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;if(previous!==undefined)process.env.ECZANELER_API_KEY=previous;}
});
