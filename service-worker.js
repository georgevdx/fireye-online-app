const CACHE_NAME = 'fireye-cache-v1.6';

const FILES_TO_CACHE = [
  '/fireye-online-app/',
  '/fireye-online-app/index.html',
  '/fireye-online-app/app.js',
  '/fireye-online-app/manifest.json',
  '/fireye-online-app/occupancies.json',
  '/fireye-online-app/requirements.json',
  '/fireye-online-app/checklists.json',
  '/fireye-online-app/templates.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});