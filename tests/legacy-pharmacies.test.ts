import test from 'node:test';
import assert from 'node:assert/strict';
import {parseIstanbulPharmacies,parseIzmirPharmacies,pharmacyProvider,ISTANBUL_SOURCE_URL} from '../lib/providers/pharmacies';

const now=new Date('2026-10-09T13:00:00Z');
const istanbulParams={city:'İstanbul',lat:41,lng:29,radius:100,category:'Eczane',query:'',demo:false};
const izmirParams={city:'İzmir',lat:38.42,lng:27.13,radius:100,category:'Eczane',query:'',demo:false};
const ieoRow={sicil:123,eczane_ad:'Fixture Eczanesi',eczane_tel:'2163812112',il:'İstanbul',ilce:'Kadıköy',mahalle:'Fixture Mahallesi',cadde_sokak:'Fixture Sokak',bina_kapi:'24',lat:'41.000000',lng:'29.000000',nobet_bitis:null};
const izmirRow={Tarih:'2026-10-09T08:00:00',LokasyonX:'38.420000',LokasyonY:'27.130000',BolgeAciklama:'',Adi:'Fixture Eczanesi',Telefon:'02324580410',Adres:'Fixture Sokak No 24',BolgeId:4,Bolge:'Konak',EczaneId:-1};

test('İstanbul and Yalova records are scoped by the explicit province field',()=>{
  const payload={error:0,eczaneler:[ieoRow,{...ieoRow,sicil:124,eczane_ad:'Yalova fixture',il:'Yalova',ilce:'Merkez',lat:'40.6500',lng:'29.2700'}]};
  const istanbul=parseIstanbulPharmacies(payload,istanbulParams,now);
  const yalova=parseIstanbulPharmacies(payload,{...istanbulParams,city:'Yalova'},now);
  assert.deepEqual(istanbul.places.map(place=>place.id),['ieo-123']);
  assert.deepEqual(yalova.places.map(place=>place.id),['ieo-124']);
  assert.match(istanbul.places[0].address,/İstanbul$/);
  assert.match(yalova.places[0].address,/Yalova$/);
  assert.throws(()=>parseIstanbulPharmacies(payload,{...istanbulParams,city:'Kocaeli'},now));
  const missingProvince=parseIstanbulPharmacies({error:0,eczaneler:[ieoRow,{...ieoRow,sicil:125,il:undefined}]},istanbulParams,now);
  assert.equal(missingProvince.places.length,1);
  assert.equal(missingProvince.partial,true);
});

test('legacy source envelopes and missing names or usable addresses fail closed',()=>{
  for(const payload of [{error:'0',eczaneler:[ieoRow]},{error:1,eczaneler:[ieoRow]},{error:0,eczaneler:{}},[]])assert.throws(()=>parseIstanbulPharmacies(payload,istanbulParams,now));
  for(const row of [{...ieoRow,eczane_ad:undefined},{...ieoRow,eczane_ad:'undefined'},{...ieoRow,mahalle:'',cadde_sokak:''},{...ieoRow,ilce:null}])assert.throws(()=>parseIstanbulPharmacies({error:0,eczaneler:[row]},istanbulParams,now));
  for(const row of [{...izmirRow,Adi:undefined},{...izmirRow,Adres:'undefined'},{...izmirRow,Bolge:null}])assert.throws(()=>parseIzmirPharmacies([row],izmirParams,now));
  assert.throws(()=>parseIzmirPharmacies({data:[izmirRow]},izmirParams,now));
});

test('missing, blank, swapped and nonnumeric coordinates are skipped without conversion guesses',()=>{
  const invalid=[undefined,null,'',' ',{},'41garbage',Infinity,NaN];
  const rows=invalid.map((lat,index)=>({...ieoRow,sicil:200+index,lat}));
  rows.push({...ieoRow,sicil:300,lat:'29',lng:'41'});
  const ieo=parseIstanbulPharmacies({error:0,eczaneler:[ieoRow,...rows]},istanbulParams,now);
  assert.deepEqual(ieo.places.map(place=>place.id),['ieo-123']);
  assert.equal(ieo.partial,true);
  const izmir=parseIzmirPharmacies([izmirRow,...invalid.map((LokasyonX,index)=>({...izmirRow,EczaneId:index,LokasyonX})),{...izmirRow,EczaneId:100,LokasyonX:'27.13',LokasyonY:'38.42'}],izmirParams,now);
  assert.equal(izmir.places.length,1);
  assert.equal(izmir.places[0].lat,38.42);
  assert.equal(izmir.places[0].lng,27.13);
  assert.equal(izmir.partial,true);
});

test('only validated telephone strings are exposed, including source-specific local formats',()=>{
  assert.equal(parseIstanbulPharmacies({error:0,eczaneler:[ieoRow]},istanbulParams,now).places[0].phone,'02163812112');
  assert.equal(parseIzmirPharmacies([izmirRow],izmirParams,now).places[0].phone,'02324580410');
  for(const phone of [undefined,123,'not a telephone','javascript:alert(1)']){
    const ieo=parseIstanbulPharmacies({error:0,eczaneler:[{...ieoRow,eczane_tel:phone}]},istanbulParams,now);
    assert.equal(ieo.places[0].phone,undefined);
    assert.equal(ieo.partial,true);
    assert.equal(parseIzmirPharmacies([{...izmirRow,Telefon:phone}],izmirParams,now).places[0].phone,undefined);
  }
});

test('İzmir accepts only the current Turkey calendar date, including before08:00',()=>{
  const beforeEight=new Date('2026-10-09T04:59:00Z');
  assert.throws(()=>parseIzmirPharmacies([{...izmirRow,Tarih:'2026-10-08T08:00:00'}],izmirParams,beforeEight));
  for(const Tarih of ['2026-10-08T08:00:00','2026-10-10T08:00:00','2026-02-30T08:00:00','2026-10-09T25:00:00','2026-10-09T08:00:00junk'])assert.throws(()=>parseIzmirPharmacies([{...izmirRow,Tarih}],izmirParams,now));
  const mixed=parseIzmirPharmacies([izmirRow,{...izmirRow,Tarih:'2026-10-08T08:00:00'}],izmirParams,now);
  assert.equal(mixed.places.length,1);
  assert.equal(mixed.partial,true);
  assert.throws(()=>parseIzmirPharmacies([izmirRow],{...izmirParams,city:'Manisa'},now));
});

test('legacy records expire within five minutes and never cross Turkey midnight',()=>{
  const late=new Date('2026-10-09T20:59:00Z');
  for(const result of [parseIstanbulPharmacies({error:0,eczaneler:[ieoRow]},istanbulParams,late),parseIzmirPharmacies([izmirRow],izmirParams,late)]){
    assert.equal(result.fetchedAt,late.toISOString());
    assert.equal(result.places[0].verifiedUntil,'2026-10-09T21:00:00.000Z');
    assert.equal(result.places[0].allDay,false);
    assert.equal(result.places[0].status,'unknown');
  }
  assert.equal(parseIzmirPharmacies([izmirRow],izmirParams,now).places[0].verifiedUntil,'2026-10-09T13:05:00.000Z');
  assert.throws(()=>parseIzmirPharmacies([izmirRow],izmirParams,new Date('2026-10-09T21:00:00Z')));
});

test('valid distant records yield an empty radius result rather than a false stale-source error',()=>{
  assert.equal(parseIstanbulPharmacies({error:0,eczaneler:[{...ieoRow,lat:'42'}]},{...istanbulParams,radius:1},now).places.length,0);
  assert.equal(parseIzmirPharmacies([{...izmirRow,LokasyonX:'39'}],{...izmirParams,radius:1},now).places.length,0);
});

test('fetch completion determines timestamps and uses only existing public IEO operations',async()=>{
  const original=globalThis.fetch;
  let calls=0,completedAt=0;
  try{
    globalThis.fetch=async(input,init)=>{
      calls++;
      if(calls===1){
        assert.equal(String(input),ISTANBUL_SOURCE_URL);
        return new Response('<input id="h" value="public-fixture-nonce">');
      }
      assert.equal(String(input),ISTANBUL_SOURCE_URL+'index.php');
      assert.equal(init?.method,'POST');
      assert.equal(new URLSearchParams(init?.body as URLSearchParams).get('islem'),'get_eczane_markers');
      const response=Response.json({error:0,eczaneler:[ieoRow]});
      const json=response.json.bind(response);
      response.json=async()=>{
        await new Promise(resolve=>setTimeout(resolve,10));
        const body=await json();
        completedAt=Date.now();
        return body;
      };
      return response;
    };
    const result=await pharmacyProvider.search(istanbulParams);
    assert.equal(calls,2);
    assert.ok(Date.parse(result.fetchedAt)>=completedAt);
    assert.ok(Date.parse(result.places[0].verifiedUntil!)<=Date.parse(result.fetchedAt)+300000);
  }finally{globalThis.fetch=original;}
});



test('source duty dates are preserved only where the record explicitly supplies one',()=>{
  assert.equal(parseIzmirPharmacies([izmirRow],izmirParams,now).places[0].dutyDate,'2026-10-09');
  assert.equal(parseIstanbulPharmacies({error:0,eczaneler:[ieoRow]},istanbulParams,now).places[0].dutyDate,undefined);
});
