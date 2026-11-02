import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseResolvedLocation,validTurkeyCoordinates} from '../lib/location-validation';
import {pharmacyProvider} from '../lib/providers/pharmacies';
import {GET as locationGET} from '../app/api/location/route';
import {readFileSync} from 'node:fs';
test('rejects non-finite, foreign and incomplete geocoder results',()=>{for(const p of [[NaN,29],[41,Infinity],[10,20]])assert.equal(validTurkeyCoordinates(...p as [number,number]),false);assert.equal(parseResolvedLocation({display_name:'Place',lat:'NaN',lon:'29',address:{city:'İstanbul'}}),undefined);assert.equal(parseResolvedLocation({display_name:'Place',lat:'41',lon:'29'}),undefined);assert.deepEqual(parseResolvedLocation({display_name:'Konak, İzmir',lat:'38.4',lon:'27.1',address:{province:'İzmir ili'}}),{label:'Konak, İzmir',city:'İzmir',lat:38.4,lng:27.1});});
test('unsupported province is a coverage state, not absence of duty pharmacies',async()=>{const data=await pharmacyProvider.search({city:'Sakarya',lat:40.78,lng:30.4,radius:10,category:'Eczane',demo:false,query:''});assert.equal(data.coverageStatus,'unsupported');assert.equal(data.places.length,0);});
test('geocoding rejects invalid request coordinates before external access',async()=>{assert.equal((await locationGET(new Request('https://example.test/api/location?lat=NaN&lng=29'))).status,400);assert.equal((await locationGET(new Request('https://example.test/api/location?q=x'))).status,400);});
test('skip-link target survives the unselected location state and location has a direct GPS path plus manual fallback',()=>{const page=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');assert.match(page,/<main[^>]+id="eczaneler"/);assert.match(page,/onClick=\{requestDeviceLocation\}[^>]*>[\s\S]*Konumumu kullan/);assert.match(page,/className="location-manual"/);assert.match(page,/>\s*İl \/ ilçe seç/);assert.doesNotMatch(page,/className="brand" href="#"/);const footer=readFileSync(new URL('../components/site-footer.tsx',import.meta.url),'utf8');assert.doesNotMatch(footer,/className="brand" href="#"/);});
test('geocoder cache expires and concurrent global source pressure reports retry timing',async()=>{
 const originalFetch=globalThis.fetch,originalNow=Date.now;let time=Date.parse('2026-10-12T12:00:00Z'),calls=0;
 try{
  Date.now=()=>time;globalThis.fetch=(async()=>{calls++;return Response.json([{display_name:'Kadıköy, İstanbul',lat:'40.99',lon:'29.03',address:{province:'İstanbul'}}]);}) as typeof fetch;
  const req=()=>new Request('https://example.test/api/location?q=AuditFixture');
  assert.equal((await locationGET(req())).status,200);assert.equal(calls,1);
  assert.equal((await locationGET(req())).status,200);assert.equal(calls,1);
  const busy=await locationGET(new Request('https://example.test/api/location?q=AnotherFixture'));assert.equal(busy.status,429);assert.equal(busy.headers.get('Retry-After'),'2');
  time+=300001;assert.equal((await locationGET(req())).status,200);assert.equal(calls,2);
 }finally{globalThis.fetch=originalFetch;Date.now=originalNow;}
});
