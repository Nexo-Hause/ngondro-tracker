const CACHE = 'ngondro-v5';
const ASSETS = [
  './', './index.html', './manifest.json', './icon.svg',
  './data.js', './app.js',
  './images/dorje-drolo.jpg', './images/refugio-arbol.jpg',
  './images/maestro-1.jpg', './images/maestro-2.jpg', './images/maestro-3.jpg',
  './audio/postraciones.m4a'
];

// El código (html/js) se sirve red-primero: si no, el celular se queda con una
// versión vieja cacheada y los arreglos nunca llegan. Imágenes y audio, cache-primero.
const isCode = path => /\.(html|js)$/.test(path) || path.endsWith('/');

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

  const url = new URL(req.url);

  // NUNCA tocar la base de datos ni el login. La Cache API ignora los encabezados,
  // así que cachear /rest/v1 servía listas de sesiones viejas (o de otra sesión de
  // usuario) como si fueran frescas: ese era el "no me guarda" real.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate' || isCode(url.pathname)) {
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
    }))
  );
});
