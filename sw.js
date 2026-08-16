// sw.js - Service Worker für GitHub Pages & Offline-Caching
const CACHE_NAME = 'upperracing-v9.0-main';
const assetsToCache = [
  './',
  './index.html',
  './app-base.html',
  './style.css',
  './app.js',
  './schedule.js',
  './pack.js',
  './backup.js',
  './weather.js',
  './manifest.json',
  './icon.png',
  './preview/proxy.js',
  './preview/preview.js',
  './preview/parser-prefilter.js',
  './preview/parser-turn-gap-fix.js',
  './preview/parser-v4.js',
  './preview/stardesign-finder.js',
  './preview/schedule-mobile-ui.js',
  './preview/day-rollover.js',
  './preview/header-program-context.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assetsToCache);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => undefined);
    })
  );
});
