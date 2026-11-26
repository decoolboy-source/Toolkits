// Cache Storage dùng chung cả origin decoolboy-source.github.io: chỉ xóa cache của chính app này.
const CACHE_PREFIX = 'Toolkits-';
// Tiền tố cũ của chính app này (trước khi đổi sang tên repo): vẫn dọn để không để lại cache rác.
const LEGACY_CACHE_PREFIX = 'appthermoengine-';
const CACHE_NAME = CACHE_PREFIX + 'v5';
const APP_SHELL = [
  './AppThermoEngine.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './vendor/lucide.min.js',
  './vendor/fonts/fonts.css',
  './vendor/fonts/Inter-latin.woff2',
  './vendor/fonts/Inter-latin-ext.woff2',
  './vendor/fonts/Inter-vietnamese.woff2',
  './vendor/fonts/JetBrainsMono-latin.woff2',
  './vendor/fonts/JetBrainsMono-latin-ext.woff2',
  './vendor/fonts/JetBrainsMono-vietnamese.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => (k.startsWith(CACHE_PREFIX) || k.startsWith(LEGACY_CACHE_PREFIX)) && k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./AppThermoEngine.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
