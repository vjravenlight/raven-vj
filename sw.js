/* RAVEN VJ — service worker: network-first con fallback a cache.
   Con internet: sirve lo último y refresca el cache.
   Sin internet: sirve el cache completo (la app funciona offline). */
const CACHE = 'ravenvj-v5';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg',
  './remote.html', './output.html', './peerjs.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return; // no tocar CDNs externos
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html'))
    )
  );
});
