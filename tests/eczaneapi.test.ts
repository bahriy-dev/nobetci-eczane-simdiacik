import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseEczaneApi} from '../lib/providers/eczaneapi';
import {pharmacyProvider} from '../lib/providers/pharmacies';

const params=(city:string,lat:number,lng:number)=>({city,lat,lng,radius:2000,category:'Eczane',query:'',demo:false});
const row=(id:number,day:string,extra:Record<string,unknown>={})=>({id,name:`ECZANE ${id}`,address:'Caferağa Mah. Moda Cad. No:1',phone:'0216 111 22 33',
  location:{latitude:40.99,longitude:29.03},city:{name:'İstanbul',slug:'istanbul'},district:{name:'Kadıköy'},duty:{date:`${day}T00:00:00.000Z`,isVerified:true},...extra});
const body=(rows:unknown[])=>({success:true,data:{pharmacies:rows}});

test('only the running duty day is shown: yesterday until 09:00, today after',()=>{
  const rows=body([row(1,'2026-11-02'),row(2,'2026-11-03'),row(3,'2026-11-04')]);
  const names=(iso:string)=>parseEczaneApi(rows,params('İstanbul',41,29),new Date(iso)).places.map(p=>p.name);
  assert.deepEqual(names('2026-11-03T05:00:00Z'),['ECZANE 1']); // 08:00
  assert.deepEqual(names('2026-11-03T07:00:00Z'),['ECZANE 2']); // 10:00
});

test('withheld addresses send people to the phone; rows without a point or of another province are left out',()=>{
  const rows=body([row(1,'2026-11-03',{address:null}),row(2,'2026-11-03',{location:null}),row(3,'2026-11-03',{city:{name:'Yalova',slug:'yalova'}})]);
  const result=parseEczaneApi(rows,params('İstanbul',41,29),new Date('2026-11-03T12:00:00Z'));
  assert.deepEqual(result.places.map(p=>p.name),['ECZANE 1']);
  assert.match(result.places[0].address,/Kadıköy · adres paylaşılmamış/);assert.equal(result.places[0].phone,'02161112233');
  assert.ok(result.warnings?.some(w=>/telefonla sor/.test(w)));
  assert.throws(()=>parseEczaneApi(body([row(1,'2026-10-30')]),params('İstanbul',41,29),new Date('2026-11-03T12:00:00Z')),/güncel değil/);
});

test('closed provinces use EczaneAPI once a day; Ordu falls back to it; other provinces never call it',async()=>{
  const original=globalThis.fetch,saved={key:process.env.ECZANEAPI_KEY,eo:process.env.ECZANELER_API_KEY};
  const calls:string[]=[];
  try{
    delete process.env.ECZANELER_API_KEY;
    delete process.env.ECZANEAPI_KEY;
    // A fresh cache folder per run; the answer is written there once asked.
    process.env.ECZANEAPI_CACHE_DIR=mkdtempSync(join(tmpdir(),'eczaneapi-test-'));
    globalThis.fetch=async input=>{const url=String(input);calls.push(url);
      if(url.includes('eczaneapi.com')){const city=new URL(url).searchParams.get('city')!;
        const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(Date.now()-9*3_600_000);
        return Response.json(body([row(7,today,{city:{name:city,slug:city},location:{latitude:city==='ordu'?40.98:41,longitude:city==='ordu'?37.88:29}})]));}
      if(url.includes('eczanesistemi'))return new Response('Forbidden',{status:403});
      if(url.includes('turkiyeapi'))return Response.json({},{status:500});
      return new Response('<html></html>',{headers:{'content-type':'text/html'}});};
    // Without a key nothing changes: İstanbul stays an official link.
    assert.equal((await pharmacyProvider.search(params('İstanbul',41.01,28.98))).coverageStatus,'unsupported');
    assert.equal(calls.filter(url=>url.includes('eczaneapi.com')).length,0);
    process.env.ECZANEAPI_KEY='test-key';
    const first=await pharmacyProvider.search(params('İstanbul',41.01,28.98));
    await pharmacyProvider.search(params('İstanbul',41.02,28.99));
    assert.equal(first.source,'EczaneAPI');assert.equal(first.places.length,1);
    assert.equal(calls.filter(url=>url.includes('eczaneapi.com/api/v1/pharmacies/on-duty?city=istanbul')).length,1);
    assert.deepEqual(readdirSync(process.env.ECZANEAPI_CACHE_DIR),['istanbul.json']);
    assert.equal((await pharmacyProvider.search(params('Ordu',40.99,37.88))).source,'EczaneAPI');
    await pharmacyProvider.search(params('Bursa',40.18,29.06)).catch(()=>undefined);
    assert.ok(!calls.some(url=>url.includes('eczaneapi.com')&&url.includes('bursa')));
  }finally{
    globalThis.fetch=original;
    if(saved.key===undefined)delete process.env.ECZANEAPI_KEY;else process.env.ECZANEAPI_KEY=saved.key;
    if(saved.eo!==undefined)process.env.ECZANELER_API_KEY=saved.eo;
    delete process.env.ECZANEAPI_CACHE_DIR;
  }
});
