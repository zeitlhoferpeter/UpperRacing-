// sw.js - Service Worker für UpperRacing PWA (GitHub Pages kompatibel)
const CACHE_NAME = 'upperracing-v2';
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

// Installation: Dateien cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

// Fetch: Netzwerk zuerst, danach Cache-Fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
