// sw.js - Robuster Service Worker für GitHub Pages
const CACHE_NAME = 'upperracing-v6.3';
const assetsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './pack.js',
  './backup.js',
  './weather.js',
  './icon.png'
];

// Installation: Alle Dateien cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    }).then(() => self.skipWaiting())
  );
});

// Aktivierung: Alte Caches aufräumen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Netzwerk oder Cache-Fallback
self.addEventListener('fetch', (event) => {
  // Wenn die Hauptseite aufgerufen wird, im Offline-Fall direkt index.html liefern
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Für alle anderen Assets (CSS, JS, Bilder)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Offline-Fallback falls gewünscht
      });
    })
  );
});
