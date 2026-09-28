const CACHE = 'ngondro-v2';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './data.js', './app.js',
  './images/dorje-drolo.jpg', './images/refugio-arbol.jpg',
  './images/maestro-1.jpg', './images/maestro-2.jpg', './images/maestro-3.jpg',
  './audio/postraciones.m4a'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});
