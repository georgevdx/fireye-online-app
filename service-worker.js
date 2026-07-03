const CACHE_NAME = 'fire-s-manual-sprint-201';

const APP_SHELL = [
  './',
  './index.html?v=manual-sprint-201',
  './styles.css?v=manual-sprint-201',
  './app.js?v=manual-sprint-201',
  './occupancies.json',
  './requirements.json',
  './checklists.json',
  './templates.json',
  './manifest.json',
  './icon-192.png',
  './supabase-js-v2.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.warn('Service worker install cache failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(networkResponse => {
            const responseClone = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseClone);
              })
              .catch(error => {
                console.warn('Runtime cache failed:', error);
              });

            return networkResponse;
          })
          .catch(() => caches.match(request).then(cachedResponse => cachedResponse || (request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});