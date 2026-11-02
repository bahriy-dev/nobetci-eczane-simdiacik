import test from 'node:test';
import assert from 'node:assert/strict';
import {activeDutyDates,parseEczanelerPharmacies,plateForCity,searchEczanelerPharmacies,ECZANELER_API_URL} from '../lib/providers/eczaneler-org';
import {pharmacyProvider} from '../lib/providers/pharmacies';
const params={city:'İstanbul',lat:40.99,lng:29.03,radius:10,category:'Eczane',query:'',demo:false};
const row=(extra:Record<string,unknown>={})=>({id:1204,city_id:34,district_id:440,name:'Moda Eczanesi',phone:'0216 345 67 89',city:'İstanbul',district:'Kadıköy',locality:'Moda',
  address:'Moda Mah. Test Sok. No:1',address_description:'Vapur iskelesi karşısı',sentry_date:'2026-11-01',is_sentry:true,workingHours:'08:30 - 08:30',note:'',status:'publish',
  coordinates:{lat:40.987,lng:29.026},map_link:'https://www.google.com/maps/search/?api=1&query=40.987,29.026',...extra});

test('duty started yesterday stays valid only until the morning handover',()=>{
  assert.deepEqual(activeDutyDates(new Date('2026-11-01T21:30:00Z')),['2026-11-02','2026-11-01']); // 00:30 TR
  assert.deepEqual(activeDutyDates(new Date('2026-11-02T05:59:00Z')),['2026-11-02','2026-11-01']); // 08:59 TR
  assert.deepEqual(activeDutyDates(new Date('2026-11-02T06:00:00Z')),['2026-11-02']); // 09:00 TR
});

test('overnight records are shown after midnight and carry phone, source and official link',()=>{
  const result=parseEczanelerPharmacies([row()],params,new Date('2026-11-01T22:00:00Z'));
  assert.equal(result.places.length,1);
  const [place]=result.places;
  assert.equal(place.id,'eo-1204');assert.equal(place.phone,'02163456789');assert.equal(place.duty,true);assert.equal(place.verification,'provider-duty');
  assert.match(place.sourceUrl!,/istanbuleczaciodasi/);assert.match(place.hours!,/Vapur iskelesi/);assert.match(place.address,/Kadıköy/);
  assert.equal(Date.parse(place.verifiedUntil!),Date.parse('2026-11-01T22:05:00Z'));
});

test('stale, foreign and malformed rows fail closed',()=>{
  const afternoon=new Date('2026-11-02T12:00:00Z');
  assert.throws(()=>parseEczanelerPharmacies([row()],params,afternoon),/güncel değil/);
  const mixed=parseEczanelerPharmacies([row({sentry_date:'2026-11-02'}),row({id:2,city:'Ankara',sentry_date:'2026-11-02'}),row({id:3,sentry_date:'2026-11-02',coordinates:{lat:29,lng:40}})],params,afternoon);
  assert.equal(mixed.places.length,1);assert.equal(mixed.partial,true);
  assert.equal(parseEczanelerPharmacies([row({sentry_date:'2026-11-02',coordinates:{lat:41.2,lng:29.6}})],params,afternoon).places.length,0);
});

test('province names resolve to plate codes',()=>{
  assert.equal(plateForCity('İstanbul'),34);assert.equal(plateForCity('istanbul'),34);assert.equal(plateForCity('Şanlıurfa'),63);assert.equal(plateForCity('Atlantis'),undefined);
});

test('adapter pages the city list with the key in a header, never in the URL',async()=>{
  const original=globalThis.fetch,previous=process.env.ECZANELER_API_KEY;const calls:string[]=[];
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(new Date());
  try{
    process.env.ECZANELER_API_KEY='test-key';
    globalThis.fetch=async(input,init)=>{
      const url=String(input);calls.push(url);
      assert.equal(new Headers(init?.headers).get('X-Api-Key'),'test-key');assert.doesNotMatch(url,/test-key/);
      const page=Number(url.match(/sentry-city-list\/6\/(\d+)/)?.[1]);
      return Response.json({data:[row({id:page,city:'Ankara',sentry_date:today,coordinates:{lat:39.93+page/1000,lng:32.85}})],pagination:{total:2,total_pages:2}});
    };
    const result=await searchEczanelerPharmacies({...params,city:'Ankara',lat:39.93,lng:32.85});
    assert.equal(result.places.length,2);
    assert.deepEqual(calls.sort(),[ECZANELER_API_URL+'/pharmacies/sentry-city-list/6/1?limit=50',ECZANELER_API_URL+'/pharmacies/sentry-city-list/6/2?limit=50']);
  }finally{globalThis.fetch=original;if(previous===undefined)delete process.env.ECZANELER_API_KEY;else process.env.ECZANELER_API_KEY=previous;}
});

test('without a key İstanbul links to the official list instead of calling the chamber',async()=>{
  const original=globalThis.fetch,previous=process.env.ECZANELER_API_KEY;let calls=0;
  try{
    delete process.env.ECZANELER_API_KEY;
    globalThis.fetch=async()=>{calls++;return new Response('');};
    const result=await pharmacyProvider.search(params);
    assert.equal(result.coverageStatus,'unsupported');assert.equal(calls,0);
  }finally{globalThis.fetch=original;if(previous!==undefined)process.env.ECZANELER_API_KEY=previous;}
});
