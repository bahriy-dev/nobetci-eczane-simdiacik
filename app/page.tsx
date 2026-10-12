'use client';
import {useEffect,useMemo,useState,useRef,lazy,Suspense} from 'react';
import {Search,MapPin,Pill,Plus,Moon,Sun,Navigation,Heart,Clock,SlidersHorizontal,Map,LayoutList,Phone,Share2,RefreshCw,LocateFixed,X,Info,ChevronDown,ExternalLink,ArrowUpRight} from 'lucide-react';
import {Sheet,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Skeleton} from '@/components/ui/skeleton';
import {Toaster,toast} from 'sonner';
import {RegionPicker} from '@/components/region-picker';
import {filterPlaces,type Place,type PlacesResult} from '@/lib/places';
import {PharmacyCard} from '@/components/pharmacy-card';
import {PharmacyDetail} from '@/components/pharmacy-detail';
import {SiteFooter} from '@/components/site-footer';
import {pharmacyDistance as distance,pharmacyMapLink} from '@/lib/pharmacy-presentation';
import {getPharmacySource} from '@/lib/pharmacy-sources';
const PlaceMap=lazy(()=>import('@/components/place-map'));
type Location={label:string;city:string;lat:number;lng:number};
const locations:Location[]=[
  {label:'Kadıköy, İstanbul',city:'İstanbul',lat:40.9875,lng:29.0278},
  {label:'Çankaya, Ankara',city:'Ankara',lat:39.918,lng:32.858},
  {label:'Konak, İzmir',city:'İzmir',lat:38.419,lng:27.128},
  {label:'Selçuklu, Konya',city:'Konya',lat:37.8746,lng:32.4932},
  {label:'İlkadım, Samsun',city:'Samsun',lat:41.286,lng:36.33},
  {label:'Kocasinan, Kayseri',city:'Kayseri',lat:38.723,lng:35.481},
];
export default function Home(){
  const [query,setQuery]=useState(''),[debounced,setDebounced]=useState(''),[hasPhone,setHasPhone]=useState(false),[radius,setRadius]=useState('10'),[sort,setSort]=useState('distance'),[online,setOnline]=useState(true);
  const [location,setLocationValue]=useState<Location>({label:"",city:"",lat:0,lng:0}),[locationMode,setLocationMode]=useState<'default'|'manual'|'gps'|'map'>('default'),[scrollTarget,setScrollTarget]=useState<string|null>(null),[geoState,setGeoState]=useState(''),[data,setData]=useState<PlacesResult|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[refresh,setRefresh]=useState(0);
  const [selected,setSelected]=useState<Place|null>(null),[hover,setHover]=useState<string|null>(null);
  const [mobile,setMobile]=useState(false),[locationTab,setLocationTab]=useState<'region'|'address'>('region'),[locOpen,setLocOpen]=useState(true),[locQuery,setLocQuery]=useState(''),[locResults,setLocResults]=useState<Location[]>([]),[locLoading,setLocLoading]=useState(false),[locError,setLocError]=useState('');
  const [filterOpen,setFilterOpen]=useState(false),[dark,setDark]=useState(false),[mapMobile,setMapMobile]=useState(false),[now,setNow]=useState(Date.now()),[limit,setLimit]=useState(8),[focused,setFocused]=useState<string|null>(null),[helpOpen,setHelpOpen]=useState(false);
  const locationChosen=Boolean(location.city);
  const setLocation=(next:Location)=>setLocationValue(next);
  const switchLocationTab=(tab:'region'|'address')=>{setLocationTab(tab);requestAnimationFrame(()=>document.getElementById(tab+'-tab')?.focus());};
  const locationTabKeys=(event:React.KeyboardEvent<HTMLButtonElement>)=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();switchLocationTab(event.key==='Home'?'region':event.key==='End'?'address':locationTab==='region'?'address':'region');}};
  const locationRequest=useRef<AbortController|null>(null);
  useEffect(()=>{const media=window.matchMedia('(max-width:800px)');const sync=()=>setMobile(media.matches);sync();media.addEventListener('change',sync);return()=>{media.removeEventListener('change',sync);locationRequest.current?.abort();};},[]);
  const useLocation=()=>{
    if(!navigator.geolocation){setGeoState('Konum desteklenmiyor; il ve ilçe seçebilirsin.');setLocOpen(true);return;}
    setGeoState('Yakınındaki eczaneler aranıyor…');
    navigator.geolocation.getCurrentPosition(async p=>{
      const lat=p.coords.latitude,lng=p.coords.longitude;
      if(lat<35||lat>43||lng<25||lng>45){setGeoState('Türkiye içindeki konumlar destekleniyor.');setLocOpen(true);return;}
      try{const r=await fetch(`/api/location?lat=${lat}&lng=${lng}`);const d=await r.json() as Location&{error?:string};if(!r.ok||!d.city)throw new Error();setLocation({...d,lat,lng});setLocationMode('gps');setGeoState('');setLocOpen(false);}
      catch{setGeoState('İl bilgisi alınamadı. Lütfen bölgeni seç.');setLocOpen(true);}
    },()=>{setGeoState('Konumuna erişemedik. İl ve ilçe seçebilirsin.');setLocOpen(true);},{timeout:10000,maximumAge:60000});
  };
  const initialLocationRequest=useRef(false);
  useEffect(()=>{if(initialLocationRequest.current)return;initialLocationRequest.current=true;if(navigator.permissions)void navigator.permissions.query({name:'geolocation'}).then(permission=>{if(permission.state==='granted')useLocation();}).catch(()=>{});},[]);
  useEffect(()=>{
    try{const theme=localStorage.getItem('simdiacik-theme')==='dark';setDark(theme);document.documentElement.classList.toggle('dark',theme);}catch{}
    if('serviceWorker'in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{});
    const network=()=>setOnline(navigator.onLine);network();window.addEventListener('online',network);window.addEventListener('offline',network);
    const tick=setInterval(()=>setNow(Date.now()),15000);return()=>{clearInterval(tick);window.removeEventListener('online',network);window.removeEventListener('offline',network);};
  },[]);
  useEffect(()=>{const t=setTimeout(()=>setDebounced(query),300);return()=>clearTimeout(t);},[query]);
  useEffect(()=>{setSelected(null);setHover(null);setFocused(null);setScrollTarget(null);},[location.lat,location.lng,location.city,radius]);
  useEffect(()=>{
    if(!location.city){setLoading(false);setData(null);return;}
    const controller=new AbortController();setLoading(true);setError('');setData(null);setLimit(8);
    fetch('/api/places?'+new URLSearchParams({lat:String(location.lat),lng:String(location.lng),radius,city:location.city,category:'Eczane'}),{signal:controller.signal})
      .then(async r=>{const d=await r.json() as PlacesResult&{error?:string};if(!r.ok)throw new Error(d.error);return d;})
      .then(d=>{if(controller.signal.aborted)return;setData(d);setNow(Date.now());setSelected(prev=>prev?d.places.find(p=>p.id===prev.id)||null:null);})
      .catch(e=>{if(!controller.signal.aborted){setSelected(null);setError(e.message||'Güncel nöbet bilgisi alınamadı.');}})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[location.lat,location.lng,location.city,radius,refresh]);
  useEffect(()=>{const id=setInterval(()=>{if(document.visibilityState==='visible')setRefresh(x=>x+1);},120000);return()=>clearInterval(id);},[]);
  useEffect(()=>{if(selected?.verifiedUntil&&Date.parse(selected.verifiedUntil)<=now)setSelected(null);},[now,selected]);
  useEffect(()=>{
    const ctx=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>Promise<void>}}).modelContext;
    if(!ctx?.registerTool)return;const lifecycle=new AbortController();
    void Promise.resolve(ctx.registerTool({name:'set_pharmacy_search',description:'Mevcut nöbetçi eczane listesinde ad veya adres arar.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:150}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async(input:unknown)=>{const q=(input as {query?:unknown})?.query;if(typeof q!=='string'||q.length>150)throw new Error('Geçerli bir eczane araması gerekli');setQuery(q);setDebounced(q);return {query:q,category:'Eczane',searchStarted:true};}},{signal:lifecycle.signal})).catch(()=>{});
    return()=>lifecycle.abort();
  },[]);
  const results=useMemo(()=>filterPlaces(data?.places||[],{category:'Eczane',radius:Number(radius),onlyOpen:true,hasPhone,favoritesOnly:false,favorites:[],query:debounced,now}).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'tr'):a.distance-b.distance),[data,radius,hasPhone,debounced,now,sort]);
  const basePlaces=data?.places||[];
  const expired=basePlaces.some(p=>p.verifiedUntil&&Date.parse(p.verifiedUntil)<=now);
  const pharmacySource=getPharmacySource(location.city);
  const sourceLinkLabel='Nöbet listesini aç';
  const changeTheme=()=>{const next=!dark;setDark(next);document.documentElement.classList.toggle('dark',next);try{localStorage.setItem('simdiacik-theme',next?'dark':'light');}catch{}};
  const clearFilters=()=>{setQuery('');setDebounced('');setHasPhone(false);setRadius('10');setSort('distance');};
  const searchLocation=async()=>{locationRequest.current?.abort();const controller=new AbortController();locationRequest.current=controller;setLocLoading(true);setLocError('');try{const r=await fetch('/api/location?q='+encodeURIComponent(locQuery),{signal:controller.signal});const d=await r.json() as Location[]&{error?:string};if(!r.ok)throw new Error(d.error);if(controller.signal.aborted)return;setLocResults(d);if(!d.length)setLocError('Adres bulunamadı. İlçe ve şehri birlikte yaz.');}catch(e){if(!controller.signal.aborted)setLocError((e as Error).message);}finally{if(!controller.signal.aborted)setLocLoading(false);}};
  const share=async(p:Place)=>{try{const url=pharmacyMapLink(p);const name=p.name.toLocaleLowerCase('tr-TR').replace(/(^|\s)\S/g,c=>c.toLocaleUpperCase('tr-TR'));const text=name+'\n\n'+p.address+'\n\nHaritada aç:\n'+url;if(navigator.share)await navigator.share({title:name,text});else{await navigator.clipboard.writeText(text);toast.success('Eczane bilgileri ve konumu kopyalandı.');}}catch{toast.info('Paylaşım tamamlanmadı.');}};
  const controls=<><label className="switch-label"><Switch checked={hasPhone} onCheckedChange={setHasPhone}/>Telefonu olanlar</label><Select value={radius} onValueChange={setRadius}><SelectTrigger aria-label="Arama mesafesi" className="filter-select"><SelectValue/></SelectTrigger><SelectContent>{['2','5','10','20'].map(v=><SelectItem key={v} value={v}>{v} km içinde</SelectItem>)}</SelectContent></Select><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label="Eczane sıralaması" className="filter-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="distance">En yakın</SelectItem><SelectItem value="name">A–Z</SelectItem></SelectContent></Select> </>;
  const chooseMapPharmacy=(p:Place)=>{setFocused(p.id);setLimit(x=>Math.max(x,results.findIndex(r=>r.id===p.id)+1));if(window.matchMedia('(max-width:800px)').matches)setSelected(p);else{setSelected(null);setScrollTarget(p.id);}};
  useEffect(()=>{if(!scrollTarget)return;const card=document.getElementById('pharmacy-'+scrollTarget);card?.scrollIntoView({block:'nearest',behavior:'instant'});setScrollTarget(null);},[scrollTarget,limit]);
  const choosePharmacy=(p:Place)=>{setFocused(p.id);setLimit(x=>Math.max(x,results.findIndex(r=>r.id===p.id)+1));setSelected(p);};
  const copyAddress=async(p:Place)=>{try{await navigator.clipboard.writeText(p.address);toast.success("Adres kopyalandı.");}catch{toast.error("Adres kopyalanamadı.");}};
  return <><Toaster position="top-center" richColors/>
    <a className="skip-link" href="#eczaneler">Eczane sonuçlarına geç</a><header className="header"><a className="brand" href="#" aria-label="Şimdi Açık ana sayfa"><span className="brand-icon"><Plus size={25} strokeWidth={3}/></span><span className="brand-name">şimdi<span>açık</span><small>NÖBETÇİ ECZANE</small></span></a><button className="location" onClick={()=>setLocOpen(true)}><MapPin size={16}/><span>{locationChosen?location.label.split(",").slice(0,2).join(","):"Konum seç"}</span><ChevronDown size={14}/></button><button className="icon" onClick={changeTheme} aria-label={dark?'Açık temaya geç':'Koyu temaya geç'}>{dark?<Sun size={19}/>:<Moon size={19}/>}</button></header>
    <main className="pharmacy-main">{!locationChosen&&<div className="location-start"><h1>Yakınındaki nöbetçi eczaneler</h1><p>Devam etmek için konumunu onayla veya bölgeni seç.</p><button className="primary" onClick={()=>setLocOpen(true)}><MapPin size={17}/>Konum seç</button></div>}
      {locationChosen&&<section className="pharmacy-results" id="eczaneler">
        <div className="results-toolbar">
        <div className="section-heading"><div className="results-heading-copy"><h2>Nöbetçi eczaneler</h2><p className="results-location"><MapPin size={13}/><span>{locationChosen?location.label.split(',').slice(0,2).join(','):'Bölgeni seç'}</span></p></div><div className="view-controls"><button className="refresh-button" disabled={loading} onClick={()=>setRefresh(v=>v+1)} aria-label="Eczaneleri yenile"><RefreshCw size={16} className={loading?'spin':''}/></button><button className="mobile-filter" onClick={()=>setFilterOpen(true)} aria-label="Eczane filtrelerini aç"><SlidersHorizontal size={17}/><span>Filtrele</span></button></div></div><div className="results-summary" aria-live="polite"><span className="results-count">{loading?'Aranıyor…':results.length+' eczane'}</span>{!loading&&results[0]&&<span className="results-nearest"><span>En yakın</span><b>{distance(results.reduce((a,b)=>a.distance<b.distance?a:b))}</b></span>}</div>
        <div className="pharmacy-search-row"><form className="search" onSubmit={e=>{e.preventDefault();setDebounced(query);}}><Search size={19}/><input value={query} maxLength={150} onChange={e=>setQuery(e.target.value)} placeholder="Eczane adı veya adres ara" aria-label="Eczane adı veya adres ara"/>{query&&<button type="button" aria-label="Aramayı temizle" onClick={()=>setQuery('')}><X size={17}/></button>}</form><div className="filter-options">{controls}</div></div>
        <div className="distance-toolbar"><span className="distance-label">Arama mesafesi</span><div className="quick-distances" role="group" aria-label="Hızlı mesafe filtreleri">{['2','5','10','20'].map(v=><button key={v} aria-pressed={radius===v} className={radius===v?'on':''} onClick={()=>setRadius(v)}>{v} km</button>)}{(query||hasPhone)&&<button className="clear-quick" onClick={clearFilters}>Filtreleri temizle <X size={12}/></button>}</div></div></div>
        {!online&&<div className="coverage-note" role="status">İnternet bağlantısı yok. Güncel nöbet listesi için yeniden bağlan.</div>}
        <div className={'results-layout '+(mapMobile?'mobile-map':'')}><div className="results-list" aria-live="polite">
          {loading?<div className="pharmacy-list">{[1,2,3].map(x=><div key={x} className="pharmacy-skeleton"><Skeleton className="h-6 w-2/3"/><Skeleton className="h-4 w-full"/><Skeleton className="h-10 w-full"/></div>)}</div>:error?<div className="empty-state"><Info size={32}/><h3>{online?'Eczane bilgileri yüklenemedi.':'İnternet bağlantını kontrol et.'}</h3><p>Tekrar dene veya nöbet listesini aç.</p><button className="primary" onClick={()=>setRefresh(x=>x+1)}>Tekrar dene</button><a href={pharmacySource.url} target="_blank" rel="noreferrer">{sourceLinkLabel} <ExternalLink size={14}/></a></div>:!results.length?<div className="empty-state"><Pill size={32}/><h3>{expired?'Nöbet listesini yenileyelim.':basePlaces.length?'Bu filtrelere uyan eczane yok.':'Bu bölgede eczane bulunamadı.'}</h3><p>{expired?'Güncel eczaneleri görmek için listeyi yenile.':'Kayıt bulunmaması, çevrende nöbetçi eczane olmadığı anlamına gelmez.'}</p>{expired?<button className="primary" onClick={()=>setRefresh(x=>x+1)}>Güncel listeyi getir</button>:Number(radius)<20?<button className="primary" onClick={()=>setRadius('20')}>20 km içinde ara</button>:<button className="primary" onClick={clearFilters}>Filtreleri temizle</button>}<a href={pharmacySource.url} target="_blank" rel="noreferrer">{sourceLinkLabel} <ExternalLink size={14}/></a></div>:<>
            <div className="pharmacy-list">{results.slice(0,limit).map((p,i)=><PharmacyCard key={p.id} p={p} number={i+1} now={now} highlighted={hover===p.id||focused===p.id} closest={sort==='distance'&&i===0} onOpen={()=>choosePharmacy(p)} onHover={setHover}/>)}</div>{results.length>limit&&<button className="load-more" onClick={()=>setLimit(x=>x+8)}>Diğer {results.length-limit} eczaneyi göster</button>}</>}
        </div><aside className="map-column" aria-label="Nöbetçi eczane haritası"><Suspense fallback={<Skeleton className="h-full min-h-96 w-full"/>}><PlaceMap loading={loading} failed={Boolean(error)} onRetry={()=>setRefresh(v=>v+1)} onShowList={()=>setMapMobile(false)} places={results} center={[location.lat,location.lng]} selected={focused} hovered={hover} onSelect={chooseMapPharmacy} onSearchArea={(lat,lng)=>{setGeoState("Haritadaki bölge seçiliyor…");void fetch(`/api/location?lat=${lat}&lng=${lng}`).then(r=>r.json() as Promise<Location>).then(d=>{if(!d.city)throw new Error();setLocation({...d,lat,lng});setLocationMode("map");setGeoState("");}).catch(()=>toast.error("Bölge belirlenemedi. İl ve ilçe seçebilirsin."));}}/></Suspense></aside></div>

      </section>}
    </main>
    <SiteFooter sourceUrl={pharmacySource.url} onDiscover={()=>{if(!locationChosen)setLocOpen(true);else document.getElementById("eczaneler")?.scrollIntoView();}} onMap={()=>{if(!locationChosen){setLocOpen(true);return;}setMapMobile(true);document.getElementById('eczaneler')?.scrollIntoView();}} onLocation={()=>setLocOpen(true)} onHelp={()=>setHelpOpen(true)}/>
    {locationChosen&&<div className="floating-map" role="group" aria-label="Sonuç görünümü"><button aria-pressed={!mapMobile} className={!mapMobile?'on':''} onClick={()=>setMapMobile(false)}><LayoutList size={17}/>Liste</button><button aria-pressed={mapMobile} className={mapMobile?'on':''} onClick={()=>setMapMobile(true)}><Map size={17}/>Harita</button></div>}
    <Dialog open={locOpen} onOpenChange={o=>{setLocOpen(o);if(!o){locationRequest.current?.abort();setLocLoading(false);}}}><DialogContent className="location-dialog" showCloseButton={false}><div className="panel-handle" aria-hidden="true"/><button className="panel-close" onClick={()=>setLocOpen(false)} aria-label="Kapat"><X size={20}/></button><div className="location-panel-heading"><span><MapPin size={23}/></span><div><DialogTitle>Konumunu seç</DialogTitle><DialogDescription>Yakınındaki eczaneleri görmek için konumunu kullan.</DialogDescription></div></div><button className="location-gps" onClick={useLocation}><LocateFixed size={20}/><span>Konumumu kullan</span><ArrowUpRight size={17}/></button><p className="location-privacy">Konumun eczane araması ve bölgeyi belirlemek için kullanılır. <a href="/kvkk">KVKK</a> · <a href="/gizlilik">Gizlilik</a></p>{geoState&&<p className="quiet" role="status">{geoState}</p>}<div className="location-tabs" role="tablist" aria-label="Konum seçim yöntemi"><button id="region-tab" role="tab" tabIndex={locationTab==='region'?0:-1} onKeyDown={locationTabKeys} aria-selected={locationTab==='region'} aria-controls="region-panel" onClick={()=>setLocationTab('region')}>İl / ilçe seç</button><button id="address-tab" role="tab" tabIndex={locationTab==='address'?0:-1} onKeyDown={locationTabKeys} aria-selected={locationTab==='address'} aria-controls="address-panel" onClick={()=>setLocationTab('address')}>Adres ara</button></div>{locationTab==='region'?<div id="region-panel" role="tabpanel" aria-labelledby="region-tab"><RegionPicker city={location.city} onSelect={l=>{setLocation(l);setLocationMode('manual');setLocOpen(false);setGeoState('');}}/></div>:<div id="address-panel" role="tabpanel" aria-labelledby="address-tab"><form className="location-search" onSubmit={e=>{e.preventDefault();void searchLocation();}}><Search size={17}/><input aria-label="Şehir, ilçe veya mahalle" placeholder="Mahalle, ilçe veya adres" value={locQuery} onChange={e=>{locationRequest.current?.abort();setLocLoading(false);setLocQuery(e.target.value);setLocResults([]);setLocError('');}} minLength={3} required/><button disabled={locLoading}>{locLoading?'Aranıyor…':'Ara'}</button></form>{locError&&<p className="location-panel-error" role="alert">{locError}</p>}<div className="location-results">{locResults.map(l=><button key={l.label} onClick={()=>{setLocation(l);setLocationMode('manual');setLocOpen(false);setGeoState('');}}><MapPin size={16}/><span>{l.label}</span><ArrowUpRight size={15}/></button>)}</div></div>}<div className="location-shortcuts"><span>Hızlı seçim</span><div>{locations.map(l=><button key={l.label} onClick={()=>{setLocation(l);setLocationMode('manual');setLocOpen(false);setGeoState('');}}><b>{l.city}</b><small>{l.label.split(',')[0]}</small></button>)}</div></div></DialogContent></Dialog>
    <Sheet open={Boolean(selected)} onOpenChange={o=>{if(!o)setSelected(null);}}><SheetContent side="bottom" className="detail-sheet" showCloseButton={false}>{selected&&<PharmacyDetail place={selected} now={now} onClose={()=>setSelected(null)} onCopy={()=>void copyAddress(selected)} onShare={()=>void share(selected)}/>}</SheetContent></Sheet>
    <Sheet open={filterOpen} onOpenChange={setFilterOpen}><SheetContent side="bottom" className="filter-sheet"><SheetTitle>Eczane filtreleri</SheetTitle><SheetDescription>Arama mesafesini ve telefon bilgisini seç.</SheetDescription><div>{controls}</div><button className="primary" onClick={()=>setFilterOpen(false)}>{loading?'Listeye dön':`${results.length} eczaneyi göster`}</button><button className="clear-filters" onClick={clearFilters}>Filtreleri temizle</button></SheetContent></Sheet>
    <Sheet open={helpOpen} onOpenChange={setHelpOpen}><SheetContent side="bottom" className="menu-sheet"><SheetTitle>Nöbetçi eczaneyi nasıl bulurum?</SheetTitle><SheetDescription>Üç kolay adımda eczaneye ulaş.</SheetDescription><h3>1. Konumunu seç</h3><p>Konumumu kullan düğmesine dokun veya il ve ilçe seç. Konum izni vermeden de arama yapabilirsin. Daha önce konum izni verdiysen bulunduğun bölge otomatik belirlenir.</p><h3>2. Listeyi veya haritayı incele</h3><p>Eczaneler yakınlık sırasıyla gösterilir. Kartlardaki numaralar haritadaki pinlerle eşleşir. </p><h3>3. Ara ve yol tarifi al</h3><p>Pin veya eczane adına dokun. Gitmeden önce Ara düğmesiyle telefonla teyit et; Yol tarifi ile harita uygulamasını aç.</p></SheetContent></Sheet>
  </>;
}
