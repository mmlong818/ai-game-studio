const CACHE_NAME = 'star-dream-duel-v7';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=7',
  './app.js?v=7',
  './game-core.js?v=7',
  './manifest.webmanifest?v=7',
  './assets/tiles-v2/moon.png',
  './assets/tiles-v2/cloud.png',
  './assets/tiles-v2/star.png',
  './assets/tiles-v2/flower.png',
  './assets/tiles-v2/heart.png',
  './assets/tiles-v2/drop.png',
  './icons/app-icon-192.png',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});
