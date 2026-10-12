// Only cache the pharmacy offline document. Never cache live APIs or map tiles.
const OFFLINE_CACHE='simdiacik-offline-v2-pharmacy';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>cache.add(new Request('/offline.html',{cache:'no-store'}))));
  self.skipWaiting();
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('simdiacik-offline-')&&name!==OFFLINE_CACHE).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.mode!=='navigate'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).catch(async()=>{
    const cached=await (await caches.open(OFFLINE_CACHE)).match('/offline.html');
    return cached||new Response('Güncel nöbetçi eczane listesini görmek için internete bağlan.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
  }));
});
