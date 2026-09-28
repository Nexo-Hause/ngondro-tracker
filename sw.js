const CACHE = 'ngondro-v3';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './data.js', './app.js',
  './images/dorje-drolo.jpg', './images/refugio-arbol.jpg',
  './images/maestro-1.jpg', './images/maestro-2.jpg', './images/maestro-3.jpg',
  './audio/postraciones.m4a'
];

// El código (html/js) se sirve red-primero: si no, el celular se queda con una
// versión vieja cacheada y los arreglos nunca llegan. Imágenes y audio siguen cache-primero.
const isCode = url => /\.(html|js)$/.test(new URL(url).pathname) || url.endsWith('/');

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
  const req = e.request;
  if (req.method !== 'GET') return;

  if (e.request.mode === 'navigate' || isCode(req.url)) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
