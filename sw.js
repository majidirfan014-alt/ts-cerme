/* Service worker — cache aset utama agar aplikasi bisa dibuka offline */
const CACHE = 'ts-cerme-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch(e) { return; }
  if(url.origin !== self.location.origin) return;

  /* Halaman utama: ambil dari jaringan dulu supaya perubahan kode langsung
     tampil; gagal jaringan -> pakai cache agar tetap bisa dibuka offline. */
  if(req.mode === 'navigate'){
    event.respondWith(
      fetch(req).then(res => {
        if(res && res.status === 200 && res.type === 'basic'){
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match('./index.html').then(hit => hit || caches.match('./'))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => {
      if(hit) return hit;
      return fetch(req).then(res => {
        if(res && res.status === 200 && res.type === 'basic'){
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
