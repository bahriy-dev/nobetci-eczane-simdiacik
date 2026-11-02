import test from 'node:test';
import assert from 'node:assert/strict';
import {addressParts,estimatePharmacyPoint} from '../lib/geocode';
import {pageLines,pageRecords,scheduleLines} from '../lib/providers/chamber-pages';
import {pharmacyDirections} from '../lib/pharmacy-presentation';

const hit=(kind:string,lat:number,lon:number,display_name:string,province:string)=>{const [c,t]=kind.split('/');return {class:c,type:t,lat:String(lat),lon:String(lon),display_name,address:{province}};};
async function withNominatim(answers:Record<string,unknown[]>,run:(asked:string[])=>Promise<void>){
  const original=globalThis.fetch,asked:string[]=[];
  globalThis.fetch=async input=>{const q=new URL(String(input)).searchParams.get('q')??'';asked.push(q);return Response.json(answers[q]??[]);};
  try{await run(asked);}finally{globalThis.fetch=original;}
}
const malatya={province:'Malatya',center:[38.3552,38.3095] as [number,number]};

test('address parts skip directions and keep multi-word names',()=>{
  assert.deepEqual(addressParts('BATTALGAZİ DEVLET HASTANESİ ACİL KARŞISI ZAFER MAH. VALİ KONAĞI CAD. ÜZERİ'),{neighbourhood:'zafer',streets:['vali konagi caddesi']});
  assert.deepEqual(addressParts('MEHMET AKIF ERSOY MAH.SEHIT ISMAIL ÇETIN CAD.SIFA SOK.NO:21'),{neighbourhood:'mehmet akif ersoy',streets:['sehit ismail cetin caddesi','sifa sokak']});
});

test('an OSM pharmacy counts only when its street or neighbourhood agrees with the source',async()=>{
  await withNominatim({
    'Dönmez Eczanesi, Malatya':[hit('amenity/pharmacy',38.34387,38.3126,'Dönmez Eczanesi, Emeksiz Caddesi, Cevherizade Mahallesi, Battalgazi, Malatya','Malatya')],
    'Murat Eczanesi, Malatya':[hit('amenity/pharmacy',38.34836,38.33353,'Murat Eczanesi, Zencefil Sokak, Fırat Mahallesi, Battalgazi, Malatya','Malatya')],
  },async()=>{
    assert.deepEqual(await estimatePharmacyPoint({...malatya,name:'DÖNMEZ ECZANESİ',address:'CEVHERİZADE MAH. EMEKSİZ CD. NO:45/B'}),{lat:38.34387,lng:38.3126,precision:'pharmacy'});
    // A namesake elsewhere, and nothing else to go on, gives no point at all.
    assert.equal(await estimatePharmacyPoint({...malatya,name:'MURAT ECZANESİ',address:'ZAFER MAH. VALİ KONAĞI CAD.'}),undefined);
  });
});

test('a neighbourhood is used only when it is the neighbourhood itself and unambiguous',async()=>{
  await withNominatim({
    'inonu Mahallesi, Malatya':[hit('amenity/school',38.3365,38.31673,'İnönü İlk ve Orta Okulu, Başharık Mahallesi, Malatya','Malatya'),hit('building/train_station',38.3523,38.28346,'Malatya Garı, İnönü Mahallesi, Yeşilyurt, Malatya','Malatya')],
    'zafer Mahallesi, Malatya':[hit('boundary/administrative',38.35014,38.33405,'Zafer Mahallesi, Battalgazi, Malatya','Malatya'),hit('boundary/administrative',38.30,38.25,'Zafer Mahallesi, Yeşilyurt, Malatya','Malatya')],
  },async()=>{
    assert.deepEqual(await estimatePharmacyPoint({...malatya,name:'GAR ECZANESİ',address:'İNÖNÜ MAH. NO:30/C'}),{lat:38.3523,lng:38.28346,precision:'neighbourhood'});
    assert.equal(await estimatePharmacyPoint({...malatya,name:'X ECZANESİ',address:'ZAFER MAH. NO:1'}),undefined);
  });
});

test('dated duty tables give only the running day; local numbers and name-bearing address lines are read',()=>{
  const lines=pageLines(`<td>1 Kasım 2026</td><td>SORAL ECZANESİ</td><td>SORAL ECZANESİ</td><td>GOP BULVARI Telefon: 0356 214 60 36</td>
<td>2 Kasım 2026</td><td>DEMİR ECZANESİ</td><td>DEMİR ECZANESİ</td><td>YENİ MAH. HALİS CİNLİOĞLU CAD. NO:13G Telefon: 0356 502 60 11</td><td>3 Kasım 2026</td>`);
  const [record]=pageRecords(scheduleLines(lines,'2026-11-02')!);
  assert.deepEqual(record,{name:'DEMİR ECZANESİ',phones:['0356 502 60 11'],text:['YENİ MAH. HALİS CİNLİOĞLU CAD. NO:13G'],district:undefined});
  assert.equal(scheduleLines(lines,'2026-11-05'),undefined);
  const [menengic]=pageRecords(pageLines('<h4>MENENGİÇ ECZANESİ</h4><p>Meydanbaşı Mah. No:85 Menengiç Eczanesi Battalgazi/MALATYA</p>'));
  assert.deepEqual(menengic.text,['Meydanbaşı Mah. No:85 Menengiç Eczanesi Battalgazi/MALATYA']);
});

test('directions to a neighbourhood-level estimate search the address, not the rough point',()=>{
  assert.match(pharmacyDirections({lat:38.35,lng:38.33,name:'GAR ECZANESİ',address:'İNÖNÜ MAH. · Malatya',locationEstimate:'neighbourhood'}),/destination=GAR%20ECZANES%C4%B0%2C%20%C4%B0N%C3%96N%C3%9C%20MAH.%2C%20Malatya$/);
  assert.match(pharmacyDirections({lat:38.35,lng:38.33,locationEstimate:'pharmacy'}),/destination=38.35,38.33$/);
});
