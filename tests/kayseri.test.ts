import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKayseriPharmacies, parseKayseriCbsPharmacies, kayseriPharmacyProvider, KAYSERI_SOURCE_URL} from '../lib/providers/kayseri';

const params = {lat:38.72,lng:35.48,radius:10,category:'Eczane',query:'',demo:false,city:'Kayseri'};
const now = new Date('2026-10-07T19:00:00Z');
const fixture = {id:0,name:'Fixture Pharmacy',watchDate:'07.10.2026',address:'Test address',district:'KOCASİNAN',phone:'0 (352) 000 00 00',watchType:'24 Saat Açık',latitude:38.723,longitude:35.481};
const mapEndpoint = 'https://cbs.kayseri.bel.tr/KentRehberi.aspx/JSNobetciEczaneler';
const apiEndpoint = 'https://acikveri.kayseri.bel.tr/api/kbb/eczane';
const marker = {Cbno:'502',Adi:'GÜLÇİN ECZANESİ',Ilce:'KOCASİNAN',Adres:'Test & Street',Telefon:'0352 000 00 00',NobetTuruAciklama:'24 Saat Açık',Geom:'35.481|38.723'};
const escape = (value:string) => value.replace(/&/g,'&amp;').replace(/Ü/g,'&#220;').replace(/Ç/g,'&#xC7;');
const cbsHtml = (date=fixture.watchDate, markers=[marker]) => `<span id="ctl00_CPHContent_lblBilgiText">${date} Tarihli Nöbetçi Eczaneler</span>
  <table id="unrelated"><tr><td>Unrelated content</td></tr></table>
  <table id="ctl00_CPHContent_grdGirlmisNobetler"><tr><th>Konumu</th><th>Adı</th><th>İlçe</th><th>Mahalle</th><th>Nöbet Türü</th><th>Telefon</th><th>Adres</th></tr>
  ${markers.map(row=>`<tr><td><a href="Kayseri-Kent-Rehberi?NID=${row.Cbno}">Harita</a></td><td><font><b>${escape(row.Adi)}</b></font></td><td>${row.Ilce}</td><td>Test neighbourhood</td><td>${escape(row.NobetTuruAciklama)}</td><td>${row.Telefon}</td><td>${escape(row.Adres)}</td></tr>`).join('')}</table>`;
const currentDate = () => new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul'}).format(new Date()).replaceAll('/','.');

test('Kayseri uses dated official records and does not infer 24/7 from duty type',()=>{
  const result=parseKayseriPharmacies([fixture],params,now);
  assert.equal(result.places.length,1);
  assert.equal(result.places[0].phone,'03520000000');
  assert.equal(result.places[0].status,'unknown');
  assert.equal(result.places[0].allDay,false);
  assert.equal(result.places[0].duty,true);
});
test('Kayseri rejects old, future and impossible calendar dates',()=>{
  for(const watchDate of ['06.10.2026','08.10.2026','31.02.2026']) {
    assert.throws(()=>parseKayseriPharmacies([{...fixture,watchDate}],params,now));
  }
});
test('Kayseri does not use repeated zero IDs and skips unusable coordinates',()=>{
  const result=parseKayseriPharmacies([fixture,fixture,{...fixture,name:'Second fixture',latitude:38.726},{...fixture,name:'Missing location',latitude:null}],params,now);
  assert.equal(result.places.length,2);
  assert.equal(new Set(result.places.map(p=>p.id)).size,2);
  assert.equal(result.partial,true);
  assert.throws(()=>parseKayseriPharmacies([{...fixture,latitude:35.48,longitude:38.72}],params,now));
});
test('Kayseri expiry ends at the date boundary and malformed responses fail',()=>{
  const result=parseKayseriPharmacies([fixture],params,new Date('2026-10-07T20:59:00Z'));
  assert.equal(result.places[0].verifiedUntil,'2026-10-07T21:00:00.000Z');
  assert.throws(()=>parseKayseriPharmacies({data:[fixture]},params,now));
  assert.throws(()=>parseKayseriPharmacies([{name:'Incomplete'}],params,now));
});
test('Kayseri access failure remains an error',async()=>{
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async()=>new Response('unavailable',{status:503});
    await assert.rejects(()=>kayseriPharmacyProvider.search(params));
  } finally {globalThis.fetch=original;}
});
test('Kayseri CBS joins dated rows by unique NID and Cbno, including a legitimate zero ID',()=>{
  const second={...marker,Cbno:'0',Adi:'Second Pharmacy',Geom:'35.482|38.726'};
  const result=parseKayseriCbsPharmacies(cbsHtml(fixture.watchDate,[marker,second]),{d:[second,marker]},params,now);
  assert.equal(result.places.length,2);
  const place=result.places.find(p=>p.name===marker.Adi)!;
  assert.equal(place.lat,38.723);
  assert.equal(place.lng,35.481);
  assert.equal(place.address,marker.Adres+' · '+marker.Ilce);
  assert.equal(place.phone,'03520000000');
  assert.equal(place.sourceUrl,KAYSERI_SOURCE_URL);
  assert.equal(place.duty,true);
  assert.equal(place.status,'unknown');
  assert.equal(place.allDay,false);
  assert.equal(Date.parse(place.verifiedUntil!)-now.getTime(),300000);
  const boundary=parseKayseriCbsPharmacies(cbsHtml(),{d:[marker]},params,new Date('2026-10-07T20:59:00Z'));
  assert.equal(boundary.places[0].verifiedUntil,'2026-10-07T21:00:00.000Z');
});
test('Kayseri CBS rejects stale dates and missing or duplicate dated sections',()=>{
  for(const date of ['06.10.2026','08.10.2026','31.02.2026']) {
    assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(date),{d:[marker]},params,now));
  }
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml().replace('ctl00_CPHContent_lblBilgiText','wrong-heading'),{d:[marker]},params,now));
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml()+cbsHtml(),{d:[marker]},params,now));
});
test('Kayseri CBS rejects mismatched identities and incomplete or duplicate map records',()=>{
  for(const change of [
    {Cbno:'999'}, {Adi:'Different Pharmacy'}, {Ilce:'TALAS'}, {Adres:'Different street'},
    {Telefon:'0352 111 11 11'}, {NobetTuruAciklama:'Gece 01.00 kadar açık'},
  ]) {
    assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(),{d:[{...marker,...change}]},params,now));
  }
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(),{d:[]},params,now));
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(),{d:[marker,marker]},params,now));
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(fixture.watchDate,[marker,marker]),{d:[marker,marker]},params,now));
  const zero={...marker,Cbno:'0'};
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(fixture.watchDate,[zero,zero]),{d:[zero,zero]},params,now));
});
test('Kayseri CBS rejects swapped, missing and malformed coordinates',()=>{
  for(const Geom of ['38.723|35.481','0|0','NaN|38.723','35.481|38.723|0','']) {
    assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(),{d:[{...marker,Geom}]},params,now));
  }
  assert.throws(()=>parseKayseriCbsPharmacies(cbsHtml(),{d:[{...marker,Geom:null}]},params,now));
});
test('Kayseri adapter uses the public dated CBS page then its ordinary anonymous map operation',async()=>{
  const original=globalThis.fetch;
  const calls:{url:string;init?:RequestInit}[]=[];
  try {
    globalThis.fetch=async(input,init)=>{
      const url=String(input);calls.push({url,init});
      const headers=new Headers(init?.headers);
      for(const header of ['Authorization','Cookie','X-API-Key'])assert.equal(headers.has(header),false);
      assert.equal(init?.cache,'no-store');
      assert.ok(init?.signal instanceof AbortSignal);
      if(url===KAYSERI_SOURCE_URL)return new Response(cbsHtml(currentDate()));
      assert.equal(url,mapEndpoint);
      assert.equal(init?.method,'POST');
      assert.deepEqual(JSON.parse(String(init?.body)),{xx:'1'});
      assert.match(headers.get('Content-Type')!,/^application\/json/);
      return Response.json({d:[marker]});
    };
    const result=await kayseriPharmacyProvider.search(params);
    assert.equal(result.places.length,1);
    assert.deepEqual(calls.map(call=>call.url),[KAYSERI_SOURCE_URL,mapEndpoint]);
    assert.equal(calls[0].init?.signal,calls[1].init?.signal);
  } finally {globalThis.fetch=original;}
});
test('Kayseri network or map failures use only the published HTTPS dataset fallback',async()=>{
  const original=globalThis.fetch;
  try {
    for(const failMap of [false,true]) {
      const urls:string[]=[];
      globalThis.fetch=async(input,init)=>{
        const url=String(input);urls.push(url);
        assert.ok(url.startsWith('https:'));
        assert.equal(new Headers(init?.headers).has('Authorization'),false);
        if(url===KAYSERI_SOURCE_URL) {
          if(!failMap)throw new TypeError('Network error');
          return new Response(cbsHtml(currentDate()));
        }
        if(url===mapEndpoint)return new Response('unavailable',{status:503});
        assert.equal(url,apiEndpoint);
        return Response.json([{...fixture,watchDate:currentDate()}]);
      };
      assert.equal((await kayseriPharmacyProvider.search(params)).places.length,1);
      assert.deepEqual(urls,failMap?[KAYSERI_SOURCE_URL,mapEndpoint,apiEndpoint]:[KAYSERI_SOURCE_URL,apiEndpoint]);
    }
  } finally {globalThis.fetch=original;}
});
test('Kayseri does not retry access denials at either CBS source',async()=>{
  const original=globalThis.fetch;
  try {
    for(const status of [401,403])for(const denyMap of [false,true]) {
      const urls:string[]=[];
      globalThis.fetch=async(input)=>{
        const url=String(input);urls.push(url);
        if(denyMap&&url===KAYSERI_SOURCE_URL)return new Response(cbsHtml(currentDate()));
        return new Response('denied',{status});
      };
      await assert.rejects(()=>kayseriPharmacyProvider.search(params),/erişim reddedildi/);
      assert.deepEqual(urls,denyMap?[KAYSERI_SOURCE_URL,mapEndpoint]:[KAYSERI_SOURCE_URL]);
    }
  } finally {globalThis.fetch=original;}
});
