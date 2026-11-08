import {distanceKm,normalized,type Place,type PlacesResult,type SearchParams} from '../places';
import {SourceFailure,classifySourceFailure} from '../source-request';
import {activeDutyDates,dutyListEnds,turkeyDay} from '../duty-day';
import {listRegions} from '../regions';
import {plateForCity} from './eczaneler-org';
import {PHARMACY_CHAMBERS} from '../pharmacy-sources';
import {cachedPharmacyPoint,type EstimatedPoint} from '../geocode';
import {z} from 'zod';
import {ORDU_DISTRICT_LISTS} from '../official-lists';

/**
 * Public "nöbetçi eczaneler" pages of pharmacist chambers. Most run the same chamber website
 * platform, others differ, so records are read by a shared pattern: a "… ECZANESİ" name followed
 * by its address, phone and a map link with coordinates. Every path used is allowed by the site's
 * robots.txt; pages behind a login, challenge or 403 are not listed here.
 */
/** `locate`: the page gives no map links, so addresses are placed via OpenStreetMap (marked as estimates).
 * `schedule`: the page is a dated table of coming duties; only the current day's row is read.
 * `areaCode`: the page writes local seven-digit numbers.
 * `parts`: the list is split into one page per district, each read under its district heading.
 * `request`: the list is fetched for the duty day (a query or the site's own public search form).
 * `prepare`: site-specific markup fixed before reading. `lines`: a source that is not a list page (the
 * chamber's own public JSON API, a card grid) turned into the same lines a page gives. */
type PageRequest={url:string;form?:Record<string,string>};
type PageOptions={locate?:boolean;schedule?:boolean;areaCode?:string;parts?:[string,string][];
  request?:(days:string[])=>PageRequest;prepare?:(html:string)=>string;lines?:(body:string,days:string[])=>string[];
  /** Said instead of "phone not verified" when the source never gives phones. */
  phoneNote?:string};
type ChamberPage={url:string;source:string;center:[number,number];siblings?:string[]}&PageOptions;
const page=(url:string,source:string,center:[number,number],siblings?:string[],options:PageOptions={}):ChamberPage=>({url,source,center,siblings,...options});
export const CHAMBER_PAGES:Readonly<Record<string,ChamberPage>>=Object.freeze({
  adana:page('https://www.adanaeo.org.tr/nobetci-eczaneler','Adana Eczacı Odası',[36.9864,35.3253]),
  adiyaman:page('https://www.adiyamaneo.org.tr/nobetci-eczaneler','Adıyaman Eczacı Odası',[37.7603,38.2773]),
  aksaray:page('https://www.aksarayeo.org.tr/nobetci-eczaneler/68','Aksaray Eczacı Odası',[38.3705,34.0269],['kirsehir']),
  kirsehir:page('https://www.aksarayeo.org.tr/nobetci-eczaneler/40','Aksaray Eczacı Odası · Kırşehir',[39.1461,34.1606],['aksaray']),
  antalya:page('https://www.antalyaeo.org.tr/tr/nobetci-eczaneler','Antalya Eczacı Odası',[36.8866,30.703]),
  aydin:page('https://www.aydineczaciodasi.org.tr/nobetci-eczaneler','Aydın Eczacı Odası',[37.8484,27.8436]),
  balikesir:page('https://www.balikesireczaciodasi.org.tr/nobetci-eczaneler','Balıkesir Eczacı Odası',[39.6474,27.888]),
  batman:page('https://batmaneczaciodasi.org.tr/nobetci-eczaneler/72','Batman Eczacı Odası',[37.8836,41.1278],['mus']),
  mus:page('https://batmaneczaciodasi.org.tr/nobetci-eczaneler/49','Batman Eczacı Odası · Muş',[38.7322,41.4899],['batman']),
  burdur:page('https://www.burdureo.org.tr/nobetci-eczaneler','Burdur Eczacı Odası',[37.7248,30.2887]),
  bursa:page('https://www.beo.org.tr/nobetci-eczaneler','Bursa Eczacı Odası',[40.1826,29.0675]),
  denizli:page('https://denizlieczaciodasi.org.tr/nobetci-eczaneler','Denizli Eczacı Odası',[37.7828,29.0966]),
  diyarbakir:page('https://diyarbakireo.org.tr/nobetci-eczaneler','Diyarbakır Eczacı Odası',[37.9162,40.2364]),
  eskisehir:page('https://www.eskisehireo.org.tr/nobetkarti','Eskişehir Eczacı Odası',[39.7744,30.5191],['bilecik']),
  bilecik:page('https://www.eskisehireo.org.tr/nobetkarti','Eskişehir Eczacı Odası · Bilecik',[40.1435,29.9753],['eskisehir']),
  kahramanmaras:page('https://www.kahramanmaraseo.org.tr/nobetci-eczaneler','Kahramanmaraş Eczacı Odası',[37.5813,36.9275]),
  kastamonu:page('https://kastamonueo.org.tr/nobetci-eczaneler/37','Kastamonu Eczacı Odası',[41.3765,33.777],['cankiri','karabuk']),
  cankiri:page('https://kastamonueo.org.tr/nobetci-eczaneler/18','Kastamonu Eczacı Odası · Çankırı',[40.5972,33.6213],['kastamonu','karabuk']),
  karabuk:page('https://kastamonueo.org.tr/nobetci-eczaneler/78','Kastamonu Eczacı Odası · Karabük',[41.1955,32.6231],['kastamonu','cankiri']),
  izmir:page('https://www.izmireczaciodasi.org.tr/nobetci-eczaneler','İzmir Eczacı Odası',[38.4237,27.1428]),
  kirklareli:page('https://kirklarelieo.org.tr/nobetci-eczaneler','Kırklareli Eczacı Odası',[41.737,27.2236]),
  kocaeli:page('https://www.kocaelieo.org.tr/nobetci-eczaneler','Kocaeli Eczacı Odası',[40.7654,29.9407]),
  manisa:page('https://www.manisaeczaciodasi.org.tr/nobetci-eczaneler','Manisa Eczacı Odası',[38.6126,27.4334]),
  mardin:page('https://www.mardineczaciodasi.org.tr/nobetci-eczaneler','Mardin Eczacı Odası',[37.3133,40.7354]),
  mersin:page('https://www.mersineczaciodasi.org.tr/nobetci-eczaneler','Mersin Eczacı Odası',[36.7978,34.6298]),
  mugla:page('https://www.muglaeczaciodasi.org.tr/nobetci-eczaneler','Muğla Eczacı Odası',[37.2152,28.3637]),
  nevsehir:page('https://www.nevsehireo.org.tr/nobetci-eczaneler','Nevşehir Eczacı Odası',[38.625,34.7151]),
  nigde:page('https://neo.org.tr/nobetci-eczaneler','Niğde Eczacı Odası',[37.9698,34.6764]),
  osmaniye:page('https://www.osmaniyeeczaciodasi.org.tr/nobetci-eczaneler','Osmaniye Eczacı Odası',[37.0734,36.2508]),
  siirt:page('https://siirteo.org.tr/nobetci-eczaneler','Siirt Eczacı Odası',[37.9274,41.9422]),
  sirnak:page('https://sirnakeo.org.tr/nobetci-eczaneler','Şırnak Eczacı Odası',[37.522,42.457]),
  yozgat:page('https://www.yozgateo.org.tr/nobetci-eczaneler','Yozgat Eczacı Odası',[39.8222,34.8081]),
  zonguldak:page('https://www.zeo.org.tr/nobetci-eczaneler/67','Zonguldak Eczacı Odası',[41.4527,31.7876],['bartin']),
  bartin:page('https://www.zeo.org.tr/nobetci-eczaneler/74','Zonguldak Eczacı Odası · Bartın',[41.635,32.3366],['zonguldak']),
  afyonkarahisar:page('https://www.afyoneczaciodasi.org.tr/nobetci-eczaneler','Afyonkarahisar Eczacı Odası',[38.7507,30.5567]),
  agri:page('https://agrieo.org.tr/nobetci-eczaneler','Ağrı Eczacı Odası',[39.7191,43.0503]),
  canakkale:page('https://www.canakkaleeo.org.tr/nobetci-eczaneler','Çanakkale Eczacı Odası',[40.1553,26.4142]),
  corum:page('https://www.corumeo.org.tr/nobetci-eczaneler','Çorum Eczacı Odası',[40.5506,34.9556]),
  duzce:page('https://duzceeo.org/nobetci-eczaneler','Düzce Eczacı Odası',[40.8438,31.1565]),
  erzincan:page('https://erzincaneo.org.tr/nobetci-eczaneler','Erzincan Eczacı Odası',[39.75,39.4914]),
  erzurum:page('https://www.erzurumeo.org.tr/nobetci-eczaneler/25','Erzurum Eczacı Odası',[39.9043,41.2679]),
  kars:page('https://www.erzurumeo.org.tr/nobetci-eczaneler/36','Erzurum Eczacı Odası · Kars',[40.6013,43.0975]),
  bayburt:page('https://www.erzurumeo.org.tr/nobetci-eczaneler/69','Erzurum Eczacı Odası · Bayburt',[40.2552,40.2249]),
  ardahan:page('https://www.erzurumeo.org.tr/nobetci-eczaneler/75','Erzurum Eczacı Odası · Ardahan',[41.1105,42.7022]),
  igdir:page('https://www.erzurumeo.org.tr/nobetci-eczaneler/76','Erzurum Eczacı Odası · Iğdır',[39.9237,44.045]),
  hatay:page('https://www.hatayeo.org.tr/nobetci-eczaneler','Hatay Eczacı Odası',[36.2025,36.1606]),
  isparta:page('https://www.ispartaeo.org.tr/nobetci-eczaneler','Isparta Eczacı Odası',[37.7648,30.5566]),
  kutahya:page('https://www.kutahyaeo.org.tr/nobetci-eczaneler','Kütahya Eczacı Odası',[39.4242,29.9833]),
  sakarya:page('https://www.seo.org.tr/nobetci-eczaneler','Sakarya Eczacı Odası',[40.7569,30.3781]),
  bolu:page('https://www.seo.org.tr/nobetci-eczaneler/14','Sakarya Eczacı Odası · Bolu',[40.7395,31.6116]),
  sivas:page('https://sivaseo.org.tr/nobetci-eczaneler','Sivas Eczacı Odası',[39.7477,37.0179]),
  tekirdag:page('https://www.teo.org.tr/nobetci-eczaneler','Tekirdağ Eczacı Odası',[40.978,27.511]),
  trabzon:page('https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/61','Trabzon Eczacı Odası',[41.0027,39.7168]),
  artvin:page('https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/8','Trabzon Eczacı Odası · Artvin',[41.1828,41.8183]),
  gumushane:page('https://www.trabzoneczaciodasi.org.tr/nobetci-eczaneler/29','Trabzon Eczacı Odası · Gümüşhane',[40.4603,39.4814]),
  van:page('https://www.vaneczaciodasi.org.tr/nobetci-eczaneler','Van Eczacı Odası',[38.4942,43.38],['bitlis','hakkari']),
  bitlis:page('https://www.vaneczaciodasi.org.tr/nobetci-eczaneler','Van Eczacı Odası · Bitlis',[38.4006,42.1095],['van','hakkari']),
  hakkari:page('https://www.vaneczaciodasi.org.tr/nobetci-eczaneler','Van Eczacı Odası · Hakkari',[37.5744,43.7408],['van','bitlis']),
  malatya:page('https://www.malatyaeczaciodasi.org.tr/nobetci-eczaneler','Malatya Eczacı Odası',[38.3552,38.3095],undefined,{locate:true}),
  usak:page('https://usakeczaciodasi.org.tr/usak-nobetci-eczaneler','Uşak Eczacı Odası',[38.6823,29.4082],undefined,{locate:true,areaCode:'0276'}),
  tokat:page('https://tokateo.org/NobetciEczane.aspx','Tokat Eczacı Odası · Merkez',[40.3139,36.5544],undefined,{locate:true,schedule:true}),
  ordu:page('https://ordueczaciodasi.org.tr/nobetci-eczaneler/','Ordu Eczacı Odası',[40.9862,37.8797],undefined,{parts:ORDU_DISTRICT_LISTS.map(({district,url})=>[district,url])}),
  sanliurfa:page('https://sanliurfaeo.org.tr/nobetci-eczaneler','Şanlıurfa Eczacı Odası',[37.1591,38.7969],undefined,{locate:true,lines:sanliurfaLines,
    request:days=>({url:`https://portal.sanliurfaeo.birodam.org.tr/auth-server/api/duty-rosters/list-grouped?page=0&size=200&sort=id,asc&dutyDateFrom=${days.at(-1)}&dutyDateTo=${days[0]}`})}),
  giresun:page('https://giresuneczaciodasi.org.tr/giresun_nobetci_eczaneler','Giresun Eczacı Odası',[40.9128,38.3895],undefined,{locate:true,lines:giresunLines,
    request:()=>({url:'https://giresuneczaciodasi.org.tr/api/pharmacies'})}),
  elazig:page('https://www.elazigeczaciodasi.org.tr/nobetci-eczaneler','Elazığ Eczacı Odası',[38.681,39.2264],['bingol','tunceli'],{request:elazigSearch}),
  bingol:page('https://www.elazigeczaciodasi.org.tr/nobetci-eczaneler','Elazığ Eczacı Odası · Bingöl',[38.8847,40.4939],['elazig','tunceli'],{request:elazigSearch}),
  tunceli:page('https://www.elazigeczaciodasi.org.tr/nobetci-eczaneler','Elazığ Eczacı Odası · Tunceli',[39.1062,39.5483],['elazig','bingol'],{request:elazigSearch}),
  karaman:page('https://karamaneo.org.tr/nobet-listesi','Karaman Eczacı Odası',[37.1811,33.215],undefined,{prepare:karamanMarkup}),
  edirne:page('https://www.edirneeo.org.tr/nobetci-eczaneler','Edirne Eczacı Odası',[41.6771,26.5557]),
  rize:page('https://rizeeczaciodasi.org.tr/nobetci-eczane','Rize Eczacı Odası',[41.0201,40.5234],undefined,{prepare:rizeMarkup}),
  // Konya's page shows names, districts and hours; addresses and phones come only through a signed
  // per-visit request, which is not used. Names are placed via OpenStreetMap pharmacies of that district.
  konya:page('https://www.konyanobetcieczaneleri.com/','Konya Eczacı Odası',[37.8714,32.4846],undefined,{locate:true,lines:konyaLines,
    phoneNote:'Konya nöbet sitesi telefonları yalnızca kendi sayfasında gösteriyor; aramak için resmî listeyi aç.'}),
});
export const chamberPageFor=(city:string)=>CHAMBER_PAGES[normalized(city).trim()];

// Elazığ's page lists nothing until its public search form is sent; one search covers all three provinces.
function elazigSearch(days:string[]):PageRequest{
  const day=days.at(-1)!;
  return {url:'https://www.elazigeczaciodasi.org.tr/nobetci-eczaneler',form:{tarih1:day,tarih2:day,ilce:'',gnr:'ARA'}};
}
// Karaman writes bare names ("BENDER") and breaks the heading date onto its own line.
function karamanMarkup(html:string){
  return html.replace(/N[öo]bet[çc]i Eczaneler\s*<br\s*\/?>\s*(\d{2}-\d{2}-\d{4})/gi,'Nöbetçi Eczaneler $1')
    .replace(/<h4>\s*(?:<i[^>]*><\/i>)?\s*([^<]{2,60}?)\s*<\/h4>/gi,(tag,name:string)=>/eczane/i.test(name)?tag:`<h4>${name} ECZANESİ</h4>`);
}
const monthNames=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
const isoOf=(day:string,month:string,year:number)=>{const m=monthNames.indexOf(normalized(month))+1;return m?`${year}-${String(m).padStart(2,'0')}-${day.padStart(2,'0')}`:undefined;};
// Rize writes bare names and "Nöbet: 3 Kasım 18:00 – 4 Kasım 08:00"; the year is in the page heading.
function rizeMarkup(html:string){
  const heading=html.match(/(\d{1,2})\s+(\p{L}+)\s+(20\d\d)/u),year=Number(heading?.[3]),day=heading?isoOf(heading[1],heading[2],year):undefined;
  const marked=html.replace(/<h3([^>]*leading-snug[^>]*)>\s*([^<]{2,60}?)\s*<\/h3>/g,(tag,attrs:string,name:string)=>/eczane/i.test(name)?tag:`<h3${attrs}>${name} ECZANESİ</h3>`)
    .replace(/N[öo]bet:\s*(\d{1,2})\s+(\p{L}+)\s+(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2})\s+(\p{L}+)\s+(\d{1,2}:\d{2})/gu,(whole,d1:string,m1:string,t1:string,d2:string,m2:string,t2:string)=>{
      const start=isoOf(d1,m1,year),end=isoOf(d2,m2,normalized(m2)==='ocak'&&normalized(m1)==='aralik'?year+1:year);
      return start&&end?`${dotted(start)} ${t1} / ${dotted(end)} ${t2} nöbetçidir.`:whole;
    });
  return day?`<input type="date" name="tarih1" value="${day}">${marked}`:marked;
}
/** Konya's card grid: each card names the pharmacy, its region and (for districts) its hours. */
function konyaLines(body:string,days:string[]){
  const title=body.match(/<title>[^<]*?(\d{1,2})\s+(\p{L}+)\s+(20\d\d)/u),day=title?isoOf(title[1],title[2],Number(title[3])):undefined;
  if(!day)return [];
  const decodeAttr=(value:string)=>value.replace(/&amp;/g,'&').replace(/&#0?39;|&apos;/g,"'").replace(/&quot;/g,'"').trim();
  const rows:ApiRow[]=body.split(/<article\b/).slice(1).flatMap(card=>{
    const attr=(name:string)=>decodeAttr(card.match(new RegExp(`data-${name}="([^"]*)"`))?.[1]??'');
    const name=attr('ad'),region=attr('bolge'),kind=attr('tur'),number=attr('no');
    if(!name||!region||!/^(merkez|ilce)$/.test(kind))return [];
    const hours=card.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
    // Central regions name urban districts too large for a district-centre point; only an exact
    // pharmacy record places them. District towns may fall back to their centre.
    return [{day,name:`${name} ECZANESİ`,district:kind==='ilce'?region:undefined,
      address:kind==='merkez'?`${region} · ${number}. nöbet bölgesi`:`${region} ilçesi`,from:hours?.[1]??'08:30',to:hours?.[2]??'08:30'}];
  });
  return apiLines([day,...days.filter(item=>item!==day)],rows);
}
const dotted=(iso:string)=>iso.split('-').reverse().join('.');
const nextDay=(iso:string)=>turkeyDay(Date.parse(`${iso}T12:00:00+03:00`)+86_400_000);
type ApiRow={day:string;name:string;district?:string;address:string;phone?:string;lat?:number|null;lng?:number|null;from:string;to:string};
/** API rows as the lines a chamber page would give: name, district, address, phone, map point and the
 * row's own interval, which then decides whether it is running (both duty days are passed in). */
function apiLines(days:string[],rows:ApiRow[]){
  return [`⟦DATE:${days[0]}⟧`,...rows.flatMap(row=>{
    const point=row.lat&&row.lng&&Number.isFinite(row.lat)&&Number.isFinite(row.lng)?[`⟦GEO:${row.lat},${row.lng}⟧`]:[];
    const ends=row.to<=row.from?nextDay(row.day):row.day;
    return [row.name,...(row.district?[row.district]:[]),row.address,...(row.phone?[`⟦TEL:${row.phone}⟧`]:[]),...point,`${dotted(row.day)} ${row.from} / ${dotted(ends)} ${row.to}`];
  })];
}
const text=z.string().trim().max(300);
// A malformed coordinate drops only that point (the address is then placed), never the whole list.
const coordinate=z.unknown().transform(value=>{const number=typeof value==='number'?value:typeof value==='string'?Number(value.trim().replace(',','.')):NaN;return Number.isFinite(number)?number:null;});
const urfaRosters=z.object({content:z.array(z.object({dutyDate:z.string(),regionName:text.nullable().optional(),
  dutyList:z.array(z.object({eczane:z.object({name:text,phone:text.nullable().optional(),location:text.nullable().optional(),district:text.nullable().optional(),latitude:coordinate,longitude:coordinate})}))}))});
/** Şanlıurfa's chamber site reads its own roster API; each roster starts at its stated time and runs a day. */
function sanliurfaLines(body:string,days:string[]){
  const rosters=urfaRosters.parse(JSON.parse(body)).content.filter(roster=>days.includes(roster.dutyDate.slice(0,10)));
  return apiLines(days,rosters.flatMap(roster=>{
    const day=roster.dutyDate.slice(0,10),from=roster.dutyDate.slice(11,16)||'08:30';
    return roster.dutyList.map(({eczane})=>{
      // "HALİLİYE ECZANESİ(topçu meydanı)": the note is a place hint, not part of the name.
      const [,name,hint]=eczane.name.match(/^(.*?)\s*(?:\(([^)]*)\))?$/)!;
      const district=eczane.district&&!/merkez/i.test(eczane.district)?eczane.district:undefined;
      return {day,name,district,address:[eczane.location,hint].filter(Boolean).join(' · '),phone:eczane.phone??undefined,lat:eczane.latitude,lng:eczane.longitude,from,to:from};
    });
  }));
}
const giresunRows=z.array(z.object({name:text,address:text,phone:text.nullable().optional(),district:text.nullable().optional(),
  is_duty:z.boolean().optional(),duty_status:text.nullable().optional(),date:z.string(),lat:coordinate,lng:coordinate}));
/** Giresun's chamber site lists days ahead; only the running day is read, with each row's stated hours. */
function giresunLines(body:string,days:string[]){
  return apiLines(days,giresunRows.parse(JSON.parse(body)).filter(row=>days.some(day=>row.date===dotted(day))&&row.is_duty!==false).map(row=>{
    const hours=row.duty_status?.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/);
    const [from,to]=hours?[`${hours[1].padStart(2,'0')}:${hours[2]}`,`${hours[3].padStart(2,'0')}:${hours[4]}`]:['08:00','08:00'];
    return {day:row.date.split('.').reverse().join('-'),name:row.name,district:row.district??undefined,address:row.address,phone:row.phone??undefined,lat:row.lat,lng:row.lng,from,to};
  }));
}

const entities:Record<string,string>={nbsp:' ',amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
const decode=(value:string)=>value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(whole,e:string)=>{
  if(e[0]!=='#')return entities[e.toLowerCase()]??whole;
  const code=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));
  return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';
});
const geoPattern=/(?:[?&](?:q|query|ll|daddr|destination)=|@|\/place\/|\/dir\/\/?)\s*(-?\d{2}\.\d{3,})\s*(?:,|%2C)\s*(-?\d{2}\.\d{3,})/i;

/** Page text as lines; phone and map links become ⟦TEL:…⟧ / ⟦GEO:lat,lng⟧ markers in reading order. */
export function pageLines(html:string){
  let h=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript|svg|select)\b[\s\S]*?<\/\1\s*>/gi,' ');
  // The shared chamber platform pre-fills its date picker with the day of the list on show.
  h=h.replace(/<input\b[^>]*>/gi,tag=>{
    const value=/type\s*=\s*["']?date/i.test(tag)&&/name\s*=\s*["']?tarih/i.test(tag)?tag.match(/value\s*=\s*["'](20\d\d-\d\d-\d\d)["']/)?.[1]:undefined;
    return value?`\n⟦DATE:${value}⟧\n`:' ';
  });
  h=h.replace(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi,(_,attrs:string,inner:string)=>{
    const href=decode(attrs.match(/href\s*=\s*["']([^"']*)["']/i)?.[1]??'');
    if(/^tel:/i.test(href))return `\n⟦TEL:${href.slice(4).trim()}⟧\n${/eczane/i.test(inner)?inner+'\n':''}`;
    const geo=href.match(geoPattern);
    // Some pages put the address inside the map link, so its text is kept.
    // A link whose text is the pharmacy's name ("GÜNDÜZ-GECE : ŞİMŞEK ECZANESİ") opens its record, so the point follows the name.
    if(geo&&nameLine.test(inner.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()))return `\n${inner}\n⟦GEO:${geo[1]},${geo[2]}⟧\n`;
    return geo?`\n⟦GEO:${geo[1]},${geo[2]}⟧\n${inner}\n`:`\n${inner}\n`;
  });
  // Some pages carry the location only inside a QR-code image address.
  h=h.replace(/<img\b[^>]*>/gi,tag=>{const geo=decode(tag).match(geoPattern);return geo?`\n⟦GEO:${geo[1]},${geo[2]}⟧\n`:' ';});
  h=h.replace(/<\/?(?:h[1-6]|p|div|li|tr|td|th|br|section|article|header|span|strong|b|small|table|ul|ol|label|button)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ');
  return decode(h).split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
}

type RawRecord={name:string;phones:string[];geo?:[number,number];text:string[];district?:string};
const nameLine=/^(?!.*(?:nöbetçi|nobetci|bugün|listesi|eczaneler(?!\p{L})))(?:.{2,90}?\s)?ECZANES[İIiı](?!\p{L})/iu;
const plainPhone=/^\+?[\d\s()-]{10,18}$/;
/** Pages group records under district headings ("Kepez", "SEYHAN BUGÜN NÖBETÇİ ECZANELER"). */
function headingDistrict(line:string,districts:Map<string,string>){
  const n=normalized(line).replace(/\s+/g,' ').trim();
  const base=n.replace(/\s*(?:bugun\s+)?(?:nobetci|nobet)\b.*$/,'').trim();
  // "MERKEZ/KIRŞEHİR BUGÜN NÖBETÇİ ECZANELER" names the district before the slash.
  return districts.get(n)??districts.get(base)??(base.includes('/')?districts.get(base.split('/')[0].trim()):undefined);
}
export function pageRecords(lines:string[],districtNames:string[]=[],province=''){
  const districts=new Map(districtNames.map(name=>[normalized(name).trim(),name]));
  // Pages head the central district with the province name; the region list calls it "Merkez".
  if(province&&districtNames.includes('Merkez')&&!districts.has(normalized(province).trim()))districts.set(normalized(province).trim(),'Merkez');
  const records:RawRecord[]=[];let current:RawRecord|undefined,heading:string|undefined;
  for(const line of lines){
    if(!line.startsWith('⟦')&&nameLine.test(line)){
      // Some pages repeat the name (title, then card); the repeat continues the same record.
      if(current?.name===line&&!current.phones.length&&!current.geo&&!current.text.length)continue;
      // …or follow it with an address line that itself ends in the name ("No:85 Menengiç Eczanesi Battalgazi").
      if(current&&!current.text.length&&!current.geo&&line.length>current.name.length&&normalized(line).includes(normalized(current.name))){current.text.push(line);continue;}
      current={name:line,phones:[],text:[],district:heading};records.push(current);continue;
    }
    const section=line.length<=60&&!line.startsWith('⟦')?headingDistrict(line,districts):undefined;
    // A district line right under a name labels that record; elsewhere it heads the records below.
    if(section&&current&&!current.text.length){current.district=section;continue;}
    if(section){heading=section;continue;}
    if(!current)continue;
    const tel=line.match(/^⟦TEL:(.*)⟧$/);
    if(tel){current.phones.push(tel[1]);continue;}
    const geo=line.match(/^⟦GEO:(.*),(.*)⟧$/);
    if(geo){current.geo??=[Number(geo[1]),Number(geo[2])];continue;}
    if(plainPhone.test(line)&&line.replace(/\D/g,'').length>=10){current.phones.push(line);continue;}
    const labelled=line.match(/^(.*?)\s*Telefon\s*:\s*([\d\s()+-]{7,20})$/i);
    if(labelled){current.phones.push(labelled[2]);if(labelled[1]&&current.text.length<8)current.text.push(labelled[1]);continue;}
    if(current.text.length<8)current.text.push(line);
  }
  return records;
}

function phoneNumber(value:string,areaCode=''){
  let digits=value.replace(/\D/g,'');
  if(areaCode&&digits.length===7)digits=areaCode+digits;
  if(/^0[2-5]\d{9}$/.test(digits))return digits;
  if(/^[2-5]\d{9}$/.test(digits))return '0'+digits;
  if(/^90[2-5]\d{9}$/.test(digits))return '+'+digits;
  return undefined;
}
const istanbulTime=(d:string,m:string,y:string,h:string,min:string)=>Date.parse(`${y}-${m}-${d}T${h.padStart(2,'0')}:${min}:00+03:00`);
const nextLocal=(now:number,h:string,min:string)=>{
  let at=Date.parse(`${turkeyDay(now)}T${h.padStart(2,'0')}:${min}:00+03:00`);
  if(at<=now)at+=86_400_000;
  return at;
};
/** The duty interval a record states about itself, in any of the forms the pages use. */
export function recordInterval(text:string,now:number,day?:string):{start?:number;end?:number}{
  const both=text.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(\d{1,2})[:.](\d{2})\s*[/–-]\s*(\d{2})[./](\d{2})[./](\d{4})\s+(\d{1,2})[:.](\d{2})/);
  if(both)return {start:istanbulTime(both[1],both[2],both[3],both[4],both[5]),end:istanbulTime(both[6],both[7],both[8],both[9],both[10])};
  const until=text.match(/(\d{2})[./](\d{2})[./](\d{4})\s+(?:saat\s+)?(\d{1,2})[:.](\d{2})\s*['’]?\s*(?:a|e|ya|ye)?\s*kadar/i);
  if(until)return {end:istanbulTime(until[1],until[2],until[3],until[4],until[5])};
  const tomorrow=text.match(/yar[ıi]n\s+sabah(?:\s+saat)?\s*,?\s*(\d{1,2})[:.](\d{2})/i);
  if(tomorrow)return {end:nextLocal(now,tomorrow[1],tomorrow[2])};
  // "SAAT 23:59'A KADAR" has no date of its own; it belongs to the page's duty day (early hours: the next morning).
  const clock=day?text.match(/(?:saat\s+)?(\d{1,2})[:.](\d{2})\s*['’]\s*(?:a|e|ya|ye)\s*kadar/i):null;
  if(clock&&day){
    const [y,m,d]=day.split('-'),hour=Number(clock[1]);
    if(hour>24)return {};
    return {end:istanbulTime(d,m,y,String(hour%24),clock[2])+(hour<9||hour===24?86_400_000:0)};
  }
  return {};
}
const months=['ocak','subat','mart','nisan','mayis','haziran','temmuz','agustos','eylul','ekim','kasim','aralik'];
/** Calendar date in a "… nöbetçi eczaneler" heading, else the platform's date picker; it must be the current duty day. */
export function pageDutyDay(lines:string[]){
  for(const line of lines){
    if(!/n[öo]bet/i.test(line)||line.length>160)continue;
    const n=normalized(line);
    const words=n.match(/(\d{1,2})\s+([a-z]+)\s+(20\d\d)/);
    const month=words?months.indexOf(words[2])+1:0;
    if(words&&month)return `${words[3]}-${String(month).padStart(2,'0')}-${words[1].padStart(2,'0')}`;
    // "Merkez Nöbetçi Eczaneler 03-11-2026" (headings only; record lines say "nöbetçidir").
    const digits=/n[öo]bet[çc]i eczane/i.test(line)?line.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d\d)/):null;
    if(digits)return `${digits[3]}-${digits[2].padStart(2,'0')}-${digits[1].padStart(2,'0')}`;
  }
  return lines.map(line=>line.match(/^⟦DATE:(20\d\d-\d\d-\d\d)⟧$/)?.[1]).find(Boolean);
}

/** Lines of a dated duty table that belong to `day`: from its "2 Kasım 2026" row to the next date row. */
export function scheduleLines(lines:string[],day:string){
  const [y,m,d]=day.split('-');
  const wanted=`${Number(d)} ${months[Number(m)-1]} ${y}`,isDate=(line:string)=>/^\d{1,2} [a-z]+ 20\d\d$/.test(normalized(line).trim());
  const start=lines.findIndex(line=>normalized(line).trim()===wanted);
  if(start<0)return undefined;
  const end=lines.findIndex((line,i)=>i>start&&isDate(line));
  return lines.slice(start+1,end<0?undefined:end);
}
const recordKey=(record:RawRecord)=>record.name+'|'+(record.text[0]??'');
function readPage(config:ChamberPage,html:string,names:string[],province:string,now:Date){
  const lines=config.lines?config.lines(html,activeDutyDates(now)):pageLines(config.prepare?config.prepare(html):html);
  if(!config.schedule)return {records:pageRecords(lines,names,province),day:pageDutyDay(lines)};
  // The running duty is yesterday's row until the morning handover.
  const active=activeDutyDates(now),day=active[active.length-1],rows=scheduleLines(lines,day);
  if(!rows)throw new Error(`${config.source} çizelgesinde güncel nöbet günü bulunamadı.`);
  return {records:pageRecords(rows,names,province),day};
}

const noise=/n[öo]bet(?:çidir|cidir| kart)|^n[öo]bet[çc][İIiı]\W*$|saat a[çc][ıi]k|^ecz(?:ac[ıi])?\s*[:.]|kadar|['’]?d[ae]n sonra|yazd[ıi]r|iletişim|harita|yol tarifi|konum|^ara$|^tümü$|telefon|^\W+$|^\*|^\d{2}\.\d{2}\.\d{4} \d{1,2}:\d{2} \/ /i;
function addressOf(text:string[],heading=''){
  const lines=text.filter(line=>!noise.test(line)&&!/^⟦/.test(line));
  const first=lines[0]??'';
  const prefixed=first.match(/^-\s*([^/]{2,40}?)\s*\/\s*(.{5,})$/);
  if(prefixed)return {district:prefixed[1].trim(),address:prefixed[2].trim()};
  if(first&&first.length<=25&&!/\d/.test(first)&&lines[1])return {district:first.replace(/^[-–]\s*/,''),address:lines[1]};
  return {district:heading,address:first};
}
const titleCase=(value:string)=>value.toLocaleLowerCase('tr-TR').replace(/(^|[\s(/-])\p{L}/gu,c=>c.toLocaleUpperCase('tr-TR'));
const cleanName=(raw:string)=>{
  // Labels around the name: "GÜNDÜZ-GECE : ŞİMŞEK ECZANESİ", "ŞİFA ECZANESİ - 03.11.2026".
  const value=raw.replace(/^[\p{Lu}\s-]{2,30}:\s*/u,'').replace(/\s+-\s+\d{1,2}[./]\d{1,2}[./]\d{4}$/,'').trim();
  return (value.length>40?value.match(/((?:[\p{L}\d.'’&-]+\s){0,3}ECZANES[İIiı])(?!\p{L})/iu)?.[1]??value:value).trim();
};

export function parseChamberPage(html:string,params:SearchParams,now=new Date(),districtNames:string[]=[],siblingDistricts:string[]=[],located=new Map<string,EstimatedPoint>()):PlacesResult{
  const city=normalized(params.city??'').trim(),config=CHAMBER_PAGES[city];
  if(!config||!Number.isFinite(now.getTime())||!Number.isFinite(params.radius)||params.radius<=0)throw new Error('Oda kaynağı bu il için tanımlı değil.');
  if(html.length>3_000_000)throw new SourceFailure('invalid-response');
  const {records,day}=readPage(config,html,[...districtNames,...siblingDistricts],params.city??'',now),time=now.getTime();
  if(day&&!activeDutyDates(now).includes(day))throw new Error(`${config.source} sayfasının tarihi güncel değil. Eski kayıtlar gösterilmedi.`);
  const siblings=(config.siblings??[]).map(key=>CHAMBER_PAGES[key].center);
  const label=(value:string)=>normalized(value).replace(/\s*[(-].*$/,'').trim();
  const ownDistricts=new Set(districtNames.map(label)),foreignDistricts=new Set(siblingDistricts.map(label));
  const fetchedAt=now.toISOString(),places:Place[]=[],ids=new Set<string>();
  let usable=0,skipped=0,expired=0,upcoming=0,missingPhone=0;
  for(const record of records){
    // İzmir-style names carry their neighbourhood: "CANSU ECZANESİ - ALİAĞA".
    const named=cleanName(record.name).match(/^(.*ECZANES[İIiı])\s+-\s+(.{2,40})$/iu);
    const name=named?named[1]:cleanName(record.name);
    const estimate=record.geo?undefined:located.get(recordKey(record));
    const geo=record.geo??(estimate?[estimate.lat,estimate.lng] as [number,number]:undefined);
    if(!geo||!name){skipped++;continue;}
    const [lat,lng]=geo;
    const own=distanceKm(config.center[0],config.center[1],lat,lng);
    if(!(lat>35&&lat<43&&lng>25&&lng<45)){skipped++;continue;}
    // Chambers serving several provinces: a record's district decides its province; a district name
    // shared by both (e.g. "Merkez") or missing falls back to the nearest centre.
    if(siblings.length){
      const area=label(addressOf(record.text,record.district).district);
      const mine=ownDistricts.has(area),theirs=foreignDistricts.has(area);
      if(theirs&&!mine)continue;
      if(!(mine&&!theirs)&&siblings.some(([a,b])=>distanceKm(a,b,lat,lng)<own))continue;
    }
    if(own>170){skipped++;continue;}
    const {start,end}=recordInterval(record.text.join(' '),time,day);
    if(end!==undefined&&end<=time){expired++;continue;}
    // A duty lasts at most a day: an end more than 24 h away belongs to a list that has not started.
    // Many chambers publish the evening shift (18:30 → morning) by day; it is shown with its start,
    // but a start further than 10 h ahead is a later day's list.
    if((start!==undefined&&start-time>10*3_600_000)||(end!==undefined&&end-time>25*3_600_000)){upcoming++;continue;}
    const opens=start!==undefined&&start>time?new Date(start).toISOString():undefined;
    const listed=addressOf(record.text,record.district),address=listed.address,district=listed.district||named?.[2]||'';
    if(address.length<5){skipped++;continue;}
    usable++;
    const id=`oda-${city}-${lat.toFixed(5)}-${lng.toFixed(5)}`;
    if(ids.has(id))continue;ids.add(id);
    const phone=record.phones.map(value=>phoneNumber(value,config.areaCode)).find(Boolean);
    if(!phone)missingPhone++;
    const distance=distanceKm(params.lat,params.lng,lat,lng);
    if(distance>params.radius)continue;
    const active=activeDutyDates(now);
    const until=end??dutyListEnds(day??active[active.length-1]);
    places.push({id,name,category:'Eczane',lat,lng,
      // Estimated points carry the province in the address so directions can search it by text.
      address:[address,district&&!normalized(address).includes(normalized(district))?titleCase(district):'',estimate&&!normalized(address).includes(normalized(params.city??''))?params.city:''].filter(Boolean).join(' · '),
      phone,status:'unknown',allDay:false,duty:true,...(day?{dutyDate:day}:{}),verification:'official-duty',
      verifiedUntil:new Date(Math.min(time+300_000,until)).toISOString(),...(end?{closes:new Date(end).toISOString()}:{}),...(opens?{opens}:{}),
      hours:end?'Resmî listeye göre nöbet bitişi kaynakta belirtilmiştir. Gitmeden önce telefonla teyit et.':'Güncel resmî nöbet listesinde. Başlangıç ve bitiş aralığı doğrulanmamış; telefonla teyit et.',
      ...(estimate?{locationEstimate:estimate.precision}:{}),distance,source:config.source,sourceUrl:config.url,fetchedAt});
  }
  if(!usable&&(expired||upcoming))throw new Error(`${config.source} sayfası şu an geçerli nöbet listesini göstermiyor.`);
  if(!usable)throw new Error(`${config.source} sayfasında doğrulanabilir nöbet kaydı bulunamadı.`);
  const warnings:string[]=[];
  if(skipped)warnings.push(`${skipped} nöbet kaydı, adres veya konum doğrulanamadığı için gösterilmedi.`);
  if(missingPhone)warnings.push(config.phoneNote??`${missingPhone} nöbet kaydının telefon bilgisi doğrulanamadı.`);
  return {places:places.sort((a,b)=>a.distance-b.distance),source:config.source,fetchedAt,coverage:`${config.source} güncel resmî nöbet listesi`,...(warnings.length?{partial:true,warnings}:{})};
}

/** Chamber pages declare UTF-8 or windows-1254; decoding the wrong one breaks Turkish letters. */
export function decodePage(bytes:ArrayBuffer,contentType:string){
  const head=new TextDecoder('latin1').decode(bytes.slice(0,4096));
  const declared=(contentType.match(/charset=([\w-]+)/i)?.[1]??head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1]??'utf-8').toLowerCase();
  const label=/1254|8859-9|turkish/.test(declared)?'windows-1254':'utf-8';
  const text=new TextDecoder(label).decode(bytes);
  return label==='utf-8'&&(text.match(/�/g)?.length??0)>20?new TextDecoder('windows-1254').decode(bytes):text;
}

// Many chamber sites share one host that refuses bursts, so each page is fetched at most every
// ten minutes and a refusal (403/429) pauses that page for half an hour instead of being retried.
const cacheMs=10*60_000,refusalPauseMs=30*60_000,answerWithinMs=9_000;
const pageCache=new Map<string,{html:string;expires:number;fetched:number}>();
const paused=new Map<string,number>();
const loading=new Map<string,Promise<string>>();
/** `reuse`: an expired copy fetched since this morning's handover is answered at once and refreshed
 * behind it (slow district hosts); a copy from before the handover is never used. */
async function fetchPage(url:string,form?:Record<string,string>,reuse=false){
  const key=form?`${url}#${new URLSearchParams(form)}`:url,cached=pageCache.get(key);
  if(cached&&cached.expires>Date.now())return cached.html;
  const handover=dutyListEnds(activeDutyDates(new Date()).at(-1)!)-86_400_000;
  if(reuse&&cached&&cached.fetched>=handover){void fetchPage(url,form).catch(()=>undefined);return cached.html;}
  // One request per page at a time, however many searches wait for it.
  const running=loading.get(key);
  if(running)return running;
  const request=download(url,form).then(html=>{pageCache.set(key,{html,expires:Date.now()+cacheMs,fetched:Date.now()});return html;}).finally(()=>loading.delete(key));
  loading.set(key,request);
  return request;
}
async function download(url:string,form?:Record<string,string>){
  if((paused.get(url)??0)>Date.now())throw new SourceFailure('rate-limited');
  let html:string;
  try{
    // The sites answer an identified client; generic browser strings receive 403 from some of them.
    const response=await fetch(url,{method:form?'POST':'GET',body:form?new URLSearchParams(form):undefined,cache:'no-store',signal:AbortSignal.timeout(12_000),
      headers:{'User-Agent':'Mozilla/5.0 (compatible; SimdiAcik/1.0; +https://simdiacik.com)','Accept-Language':'tr',...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})}});
    if(response.status===403||response.status===429)paused.set(url,Date.now()+refusalPauseMs);
    if(!response.ok)throw new SourceFailure(response.status===429?'rate-limited':'upstream',response.status);
    html=decodePage(await response.arrayBuffer(),response.headers.get('content-type')??'');
  }catch(error){throw classifySourceFailure(error);}
  return html;
}
/** A district-split list: its small pages are read three at a time (the host refuses bursts) and the
 * answer uses those that arrived in time; a slow or failed district is left out (and reported), not the
 * province. A refusal stops further requests for this search. */
async function fetchSource(config:ChamberPage,now:Date,within:number){
  if(!config.parts){const request=config.request?.(activeDutyDates(now))??{url:config.url};return {html:await fetchPage(request.url,request.form),missing:0};}
  const pages=new Map<string,string>(),queue=[...config.parts],deadline=Date.now()+within;
  let failure:unknown=new SourceFailure('timeout'),refused=false;
  const worker=async()=>{
    for(let part=queue.shift();part&&!refused&&Date.now()<deadline;part=queue.shift()){
      const [district,url]=part;
      try{pages.set(district,`<h2>${district}</h2>\n${await fetchPage(url,undefined,true)}`);}
      catch(error){failure=error;if(error instanceof SourceFailure&&error.kind==='rate-limited')refused=true;}
    }
  };
  await Promise.race([Promise.all([worker(),worker(),worker()]),new Promise(resolve=>setTimeout(resolve,within))]);
  if(!pages.size)throw failure;
  return {html:config.parts.map(([district])=>pages.get(district)??'').join('\n'),missing:config.parts.length-pages.size};
}

export async function searchChamberPage(params:SearchParams):Promise<PlacesResult>{
  const config=chamberPageFor(params.city??''),started=Date.now();
  if(!config)throw new Error('Oda kaynağı bu il için tanımlı değil.');
  const {html,missing}=await fetchSource(config,new Date(),answerWithinMs-2_000);
  // District names only label records; the list still works if the region service is down.
  const plate=plateForCity(params.city??'');
  const districtsOf=(plate?:number)=>plate?listRegions(plate).then(result=>result.regions.map(region=>region.name),()=>[] as string[]):Promise.resolve([] as string[]);
  const [districts,...others]=await Promise.all([districtsOf(plate),...(config.siblings??[]).map(key=>districtsOf(plateForCity(key)))]);
  // Pages without map links: each address is placed once via OpenStreetMap and cached for a week.
  // Lookups queue at one per second; the answer leaves within ~9 s of the search (browsers give up at
  // 12 s) and slower lookups finish in the background for the next search.
  const located=new Map<string,EstimatedPoint>();let unsettled=0,settled=0;
  if(config.locate){
    const {records}=readPage(config,html,[...districts,...others.flat()],params.city??'',new Date());
    const lookups=records.filter(item=>!item.geo).slice(0,40).flatMap(record=>{
      const {district,address}=addressOf(record.text,record.district);
      if(address.length<5)return [];
      return [cachedPharmacyPoint({name:cleanName(record.name),address,province:params.city??'',district,center:config.center,urgentUntil:started+answerWithinMs})
        .then(point=>{if(point)located.set(recordKey(record),point);},()=>undefined).finally(()=>{settled++;})];
    });
    await Promise.race([Promise.all(lookups),new Promise(resolve=>setTimeout(resolve,Math.max(1_500,answerWithinMs-(Date.now()-started))))]);
    unsettled=lookups.length-settled;
    // A dated table also shows the coming days: their addresses are placed now, in the background,
    // so tomorrow's first visitor does not wait for them.
    if(config.schedule){
      const lines=pageLines(html),today=activeDutyDates(new Date()).at(-1)!;
      for(const day of [nextDay(today),nextDay(nextDay(today))])
        for(const record of pageRecords(scheduleLines(lines,day)??[]).filter(item=>!item.geo)){
          const {district,address}=addressOf(record.text,record.district);
          if(address.length>=5)void cachedPharmacyPoint({name:cleanName(record.name),address,province:params.city??'',district,center:config.center}).catch(()=>undefined);
        }
    }
  }
  let result:PlacesResult;
  try{result=parseChamberPage(html,params,new Date(),districts,others.flat(),new Map(located));}
  catch(error){
    if(unsettled&&!located.size)throw new Error(`${config.source} listesindeki eczanelerin konumları hazırlanıyor; birkaç saniye sonra yenile.`);
    throw error;
  }
  // Records still being placed are not "unverifiable": say so, the next search shows them.
  const notes=[...(unsettled?[`${unsettled} nöbet kaydının konumu hâlâ hesaplanıyor; birkaç saniye sonra yenile.`]:[]),
    ...(missing?[`${missing} ilçenin listesi kaynaktan zamanında alınamadı; resmî listeyi de kontrol et.`]:[])];
  if(!notes.length)return result;
  return {...result,partial:true,warnings:[...(result.warnings??[]).filter(warning=>!unsettled||!/doğrulanamadığı için gösterilmedi/.test(warning)),...notes]};
}

/**
 * Keeps address-placed provinces ready on the long-running server: every half hour each such page is
 * read once and its new addresses are placed, so a visitor rarely waits for OpenStreetMap lookups.
 * Already-placed addresses come from the week-long cache and cost no lookup.
 */
let warming=false;
async function warmLocatedPages(){
  if(warming)return;warming=true;
  try{
    for(const [key,config] of Object.entries(CHAMBER_PAGES)){
      if(!config.locate)continue;
      const province=PHARMACY_CHAMBERS.find(chamber=>chamber.provinceId===plateForCity(key))?.province??key;
      await searchChamberPage({city:province,lat:config.center[0],lng:config.center[1],radius:1,category:'Eczane',query:'',demo:false}).catch(()=>undefined);
    }
  }finally{warming=false;}
}
if(process.env.NODE_ENV==='production'&&typeof setInterval==='function'){
  setTimeout(()=>void warmLocatedPages(),60_000).unref?.();
  setInterval(()=>void warmLocatedPages(),30*60_000).unref?.();
}
