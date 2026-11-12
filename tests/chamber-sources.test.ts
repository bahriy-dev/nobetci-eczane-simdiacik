import test from 'node:test';
import assert from 'node:assert/strict';
import {parseChamberPage} from '../lib/providers/chamber-pages';

const params=(city:string,lat:number,lng:number)=>({city,lat,lng,radius:2000,category:'Eczane',query:'',demo:false});
const evening=new Date('2026-11-03T18:00:00Z'); // 21:00 in Türkiye
const early=new Date('2026-11-04T05:45:00Z'); // 08:45, before the 09:00 handover

test('Giresun API rows: only the running days, each with its own hours',()=>{
  const row=(name:string,date:string,duty_status:string,lat:number|string|null)=>({name,address:'Aksu Mah. Pazar Cad. No:37',phone:'0454 222 55 55',district:'MERKEZ',is_duty:true,duty_status,date,lat,lng:38.39});
  const body=JSON.stringify([row('SARAY ECZANESİ','03.11.2026','Saat 18:00-08:00 Arası Nöbetçidir',40.9077),row('GÜNDÜZ ECZANESİ','03.11.2026','Saat 08:00-18:00 Arası Nöbetçidir',40.91),row('İLERİ ECZANESİ','13.11.2026','24 Saat Açık',40.92)]);
  const [place,...rest]=parseChamberPage(body,params('Giresun',40.91,38.39),evening,['Merkez']).places;
  assert.equal(rest.length,0);
  assert.equal(place.name,'SARAY ECZANESİ');assert.equal(place.closes,'2026-11-04T05:00:00.000Z');assert.match(place.address,/· Merkez$/);
});

test('Şanlıurfa rosters: a bad coordinate drops only the point, and a place note leaves the name',()=>{
  const roster=(dutyDate:string,name:string,latitude:unknown,longitude:unknown)=>({dutyDate,regionName:'BOZOVA',dutyList:[{eczane:{name,phone:'0414 711 68 17',location:'YEŞİLOVA MAHALLESİ BARAJ CADDESİ 73/2',district:'BOZOVA',latitude,longitude}}]});
  const body=JSON.stringify({content:[roster('2026-11-04T08:30:00','KARA ECZANESİ(baraj yolu)','37.361230','38.52'),roster('2026-11-04T08:30:00','BOZUK ECZANESİ','37.36','38,5x'),roster('2026-11-03T08:30:00','DÜN ECZANESİ','37.35','38.51')]});
  const places=parseChamberPage(body,params('Şanlıurfa',37.16,38.8),early,['Bozova']).places;
  // 08:45: both days are read, yesterday's roster ended at 08:30, today's has begun; the unlocated record is skipped.
  assert.deepEqual(places.map(p=>p.name),['KARA ECZANESİ']);
  assert.match(places[0].address,/baraj yolu/);assert.equal(places[0].closes,'2026-11-05T05:30:00.000Z');
});

test('a map link carrying the name opens the record; labels around names are removed',()=>{
  const ordu=`<h2>Fatsa</h2><div><a href="https://maps.google.com/?q=41.0301,37.5012">  GÜNDÜZ-GECE  : GAZİ ECZANESİ</a><p>Mustafa Kemal Paşa Mah. No:12</p><p>( Akbank Karşısı ) - <a href="tel:0452 423 70 06">0452 423 70 06</a></p></div>
<div><a href="https://maps.google.com/?q=41.0412,37.5121">GÜNDÜZ-GECE : SAHİL ECZANESİ</a><p>Dolunay Mah. Fikir Sok. No:1</p></div>`;
  const places=parseChamberPage(ordu,params('Ordu',40.99,37.88),evening,['Fatsa','Altınordu']).places;
  // Results come nearest first; each name keeps its own point.
  assert.deepEqual(places.map(p=>[p.name,p.lat]).sort(),[['GAZİ ECZANESİ',41.0301],['SAHİL ECZANESİ',41.0412]]);
  assert.match(places.find(p=>p.name==='GAZİ ECZANESİ')!.address,/· Fatsa$/);
});

test('Karaman: bare names and a heading date on its own line',()=>{
  const html=`<h2><span>Merkez Nöbetçi Eczaneler <br />03-11-2026</span></h2><!--<h4>ESKİ</h4>-->
<h4><i class="icon-arrow-right"></i>YAKAMOZ  </h4><strong> 04/11/2026 08:00'e kadar </strong><br><p>SAKABAŞI MAH. 860. SOK. NO: 1/A KARAMAN <br>0338 214 50 07 - <a href="https://maps.google.com/?ll=37.173171,33.223049&q=37.173171,33.223049">HARİTA</a></p>`;
  const [place]=parseChamberPage(html,params('Karaman',37.18,33.22),evening,['Merkez']).places;
  assert.equal(place.name,'YAKAMOZ ECZANESİ');assert.equal(place.dutyDate,'2026-11-03');assert.equal(place.closes,'2026-11-04T05:00:00.000Z');assert.equal(place.phone,'03382145007');
  assert.throws(()=>parseChamberPage(html.replace('03-11-2026','01-11-2026'),params('Karaman',37.18,33.22),evening,['Merkez']),/güncel değil/);
});

test('Rize: bare names and "3 Kasım 18:00 – 4 Kasım 08:00" intervals',()=>{
  const html=`<p class="font-semibold">3 Kasım 2026</p><ul><li><h3 class="m-0 font-display leading-snug">AVCI</h3><span>MERKEZ</span><address>EMİNETTİN MAH.ATATÜRK CAD.NO:247/B</address><p> Nöbet: 3 Kasım 18:00 – 4 Kasım 08:00</p>
<a href="tel:04642142824">0464 214 28 24</a><a href="https://www.google.com/maps/dir/?api=1&amp;destination=41.02749,40.514398">Yol tarifi al</a></li></ul>`;
  const [place]=parseChamberPage(html,params('Rize',41.02,40.52),evening,['Merkez','Pazar']).places;
  assert.equal(place.name,'AVCI ECZANESİ');assert.equal(place.dutyDate,'2026-11-03');assert.equal(place.closes,'2026-11-04T05:00:00.000Z');assert.match(place.address,/· Merkez$/);
});

test('Konya: names from the card grid are placed by a single same-name pharmacy, else the district town',async()=>{
  const card=(kind:string,name:string,region:string,no:string,hours='')=>`<article class="kart" data-kart data-tur="${kind}" data-lat="" data-lon="" data-ad="${name}" data-bolge="${region}" data-no="${no}" data-tel="">${hours?`<span> ${hours} </span>`:''}<h4>${name}<span> Eczanesi</span></h4></article>`;
  // The page is dated with the running duty day, so the test holds on any day.
  const [y,m,d]=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(Date.now()-9*3_600_000).split('-');
  const month=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'][Number(m)-1];
  const page=`<html><title>Konya Nöbetçi Eczaneler — ${Number(d)} ${month} ${y}</title>${card('merkez','Esra Ayhan','Selçuklu','1')}${card('ilce','İpek','Akşehir','','18:00 – 08:30')}</html>`;
  const answers:Record<string,unknown[]>={
    'Esra Ayhan Eczanesi, Konya':[{class:'amenity',type:'pharmacy',lat:'37.8845',lon:'32.4902',display_name:'Esra Ayhan Eczanesi, Selçuklu, Konya',address:{province:'Konya'}}],
    'Akşehir, Konya':[{class:'boundary',type:'administrative',lat:'38.35885',lon:'31.4202',display_name:'Akşehir, Konya, İç Anadolu Bölgesi',address:{province:'Konya'}}],
  };
  const original=globalThis.fetch,previous=process.env.ECZANELER_API_KEY;
  try{
    delete process.env.ECZANELER_API_KEY;
    globalThis.fetch=async input=>{const url=String(input);
      if(url.includes('nominatim'))return Response.json(answers[new URL(url).searchParams.get('q')??'']??[]);
      if(url.includes('turkiyeapi'))return Response.json({},{status:500});
      return new Response(page,{headers:{'content-type':'text/html; charset=utf-8'}});};
    const {searchChamberPage}=await import('../lib/providers/chamber-pages');
    const places=(await searchChamberPage(params('Konya',37.87,32.48))).places;
    const byName=Object.fromEntries(places.map(p=>[p.name,p]));
    assert.equal(byName['Esra Ayhan ECZANESİ'].locationEstimate,'pharmacy');assert.match(byName['Esra Ayhan ECZANESİ'].address,/1\. nöbet bölgesi/);
    assert.equal(byName['İpek ECZANESİ'].locationEstimate,'district');assert.equal(byName['İpek ECZANESİ'].lat,38.35885);
  }finally{globalThis.fetch=original;if(previous!==undefined)process.env.ECZANELER_API_KEY=previous;}
});

test('Kilis rows are read from the Gaziantep chamber feed, without the province note or misspelling',async()=>{
  const {parseGaziantepChamber}=await import('../lib/providers/gaziantep-chamber');
  const feed={tarih:['2026-11-03','2026-11-03'],unvan:['ARZU ECZAESİ (KİLİS)','ŞAHİNBEY ECZANESİ'],enlem:['36.70823','37.06'],boylam:['37.11','37.38'],telefon:['0348 814 22 50','0342 111 11 11'],
    adres:['Kazım Karabekir Mah. Funda Sok. No:15','Merkez'],ilce:['KİLİS MERKEZ','ŞAHİNBEY'],il:['KİLİS','GAZİANTEP'],id:['1','2']};
  const places=parseGaziantepChamber(feed,params('Kilis',36.72,37.12),evening).places;
  assert.deepEqual(places.map(p=>p.name),['ARZU ECZANESİ']);assert.match(places[0].address,/Kilis$/);
});

test('a ">" inside a quoted link attribute does not leak text that looks like a name',()=>{
  const html=`<h2>BURDUR NÖBETÇİ ECZANELER 03-11-2026</h2><p><strong>AYTAR ECZANESİ</strong></p><p>MERKEZ<br>ATATÜRK MAH. ZEYNEL ABİDİN TONGUÇ CAD. NO:13/7<br><a href="tel:02482122626">02482122626</a><br>
<a href="https://maps.google.com/maps?q=37.713223,30.231679" target="_blank" title="?=$eczane;?> Eczanesi Harita Konumu">Haritada görüntülemek için tıklayınız...</a></p>`;
  const places=parseChamberPage(html,params('Burdur',37.72,30.29),evening,['Merkez']).places;
  assert.deepEqual(places.map(p=>[p.name,p.lat]),[['AYTAR ECZANESİ',37.713223]]);
});

test('a side box repeating names without points is neither shown twice nor reported as unverifiable',()=>{
  const html=`<h3>Bugün Nöbetçi Eczaneler</h3><ul><li>ZORLU ECZANESİ</li><li>(KIRKLARELİ)</li></ul>
<h4>ZORLU ECZANESİ</h4><p>KARAKAS MAH. CUMHURİYET CAD. NO:154</p><a href="tel:02882122768">0288</a><a href="https://maps.google.com/?q=41.729474,27.220715">Harita</a>`;
  const result=parseChamberPage(html,params('Kırklareli',41.73,27.22),evening,['Merkez']);
  assert.deepEqual(result.places.map(p=>p.name),['ZORLU ECZANESİ']);assert.equal(result.warnings,undefined);
});

test('a Kilis row carrying Gaziantep coordinates is not shown there; an address estimate replaces the point',async()=>{
  const {parseGaziantepChamber}=await import('../lib/providers/gaziantep-chamber');
  const feed={tarih:['2026-11-03'],unvan:['DERMAN ECZANESİ'],enlem:['37.06675'],boylam:['37.38321'],telefon:['0348 813 10 10'],adres:['Aşıt Mah. Cumhuriyet Cad. No:5'],ilce:['KİLİS MERKEZ'],il:['KİLİS'],id:['9']};
  const plain=parseGaziantepChamber(feed,params('Kilis',36.72,37.12),evening);
  assert.equal(plain.places.length,0);assert.ok(plain.warnings?.some(w=>/konumu kaynakta hatalı/.test(w)));
  const [place]=parseGaziantepChamber(feed,params('Kilis',36.72,37.12),evening,new Map([[0,{lat:36.7165,lng:37.115,precision:'neighbourhood' as const}]])).places;
  assert.equal(place.lat,36.7165);assert.equal(place.locationEstimate,'neighbourhood');
});
