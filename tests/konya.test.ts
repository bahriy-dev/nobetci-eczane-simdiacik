import test from 'node:test';
import assert from 'node:assert/strict';
import {konyaRequest,parseKonyaPharmacies,konyaPharmacyProvider} from '../lib/providers/konya';
const now=new Date('2026-10-07T13:00:00Z');
const params={city:'Konya',lat:37.88,lng:32.49,radius:10,category:'Eczane',query:'',demo:false};
const page=(date='7 Ekim 2026',extra='')=>`<title>Konya Nöbetçi Eczaneler — ${date} Çarşamba</title><body data-j="public.nonce" data-veri="/nobet/onyuz/veri.php" ${extra}><article data-kart data-ad="Test" data-bolge="Selçuklu" data-anahtar="m-1"></article><article data-kart data-ad="Diğer" data-bolge="Selçuklu" data-anahtar="m-2"></article></body>`;
const row={adres:'Test adresi',ilce:'Selçuklu',lat:37.88,lon:32.49,telLink:'+903322200015'};
test('Konya public HTML and JSON are joined by the same card key',()=>{
  const result=parseKonyaPharmacies(page(),{'m-1':row,'m-2':{...row,lat:37.9}},params,now);
  assert.equal(result.places.length,2);assert.equal(result.places[0].phone,'+903322200015');assert.equal(result.places[0].status,'unknown');assert.equal(result.places[0].allDay,false);assert.equal(result.places[0].duty,true);
});
test('Stale, future and challenged pages fail closed',()=>{
  for(const html of [page('6 Ekim 2026'),page('8 Ekim 2026'),page('7 Ekim 2026','data-ts="challenge"')])assert.throws(()=>konyaRequest(html,now));
});
test('Missing card data and swapped coordinates cannot borrow a neighbouring card',()=>{
  const result=parseKonyaPharmacies(page(),{'m-2':row},params,now);
  assert.equal(result.places.length,1);assert.equal(result.places[0].name,'Diğer Eczanesi');assert.equal(result.partial,true);
  assert.throws(()=>parseKonyaPharmacies(page(),{'m-1':{...row,lat:32.49,lon:37.88}},params,now));
});
test('Distance and midnight cap keep records within their verified scope',()=>{
  assert.equal(parseKonyaPharmacies(page(),{'m-1':{...row,lat:39,lon:33}},params,now).places.length,0);
  const late=new Date('2026-10-07T20:59:00Z');const result=parseKonyaPharmacies(page(),{'m-1':row},params,late);
  assert.equal(result.places[0].verifiedUntil,'2026-10-07T21:00:00.000Z');
});
test('Adapter uses only the normal public endpoint with the page nonce',async()=>{
  const original=globalThis.fetch;const calls:string[]=[];
  try{globalThis.fetch=async(input,init)=>{const url=String(input);calls.push(url);if(calls.length===1){const date=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long',year:'numeric'}).format(new Date());return new Response(page(date));}assert.equal(url,'https://www.konyanobetcieczaneleri.com/nobet/onyuz/veri.php');assert.equal(new URLSearchParams(init?.body as URLSearchParams).get('j'),'public.nonce');return Response.json({'m-1':row});};
    assert.equal((await konyaPharmacyProvider.search(params)).places.length,1);assert.equal(calls.length,2);
  }finally{globalThis.fetch=original;}
});
