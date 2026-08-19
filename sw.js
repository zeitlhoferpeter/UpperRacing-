// sw.js - UpperRacing Service Worker
// Netzwerk zuerst für aktuelle App-Dateien, Cache nur als Offline-Fallback.
const CACHE_NAME = 'upperracing-v12-clean-main';
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
  './preview/header-race-detached-test.js',
  './preview/weather.js',
  './preview/tire-setup-test.js',
  './preview/dashboard-ui-v3.js',
  './preview/dashboard-refine-v4.js',
  './preview/dashboard-style-v5.js',
  './preview/weather-trackday-test.js',
  './preview/header-frame-clean-test.js',
  './preview/cloud-main-bootstrap.js',
  './preview/cloud-sync-main.js',
  './preview/header-visibility-guard-test.js',
  './preview/track-persistence-main.js',
  './preview/schedule-track-header-only-test.js',
  './preview/pack-categories-test.js',
  './preview/dashboard-layout-v6-test.js',
  './preview/pages-design-unify-test.js',
  './preview/install-prompt-main.js',
  './preview/cup-auto-test.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(assetsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())
    )).then(() => self.clients.claim())
  );
});

function sameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; }
  catch (_) { return false; }
}

function isFreshAppAsset(request) {
  if (!sameOrigin(request.url)) return false;
  const url = new URL(request.url);
  return request.destination === 'script' ||
         request.destination === 'style' ||
         request.destination === 'document' ||
         /\.(?:js|css|html)$/.test(url.pathname) ||
         url.pathname.includes('/preview/') ||
         url.pathname.includes('/preview-dashboard/');
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.mode === 'navigate' || isFreshAppAsset(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => undefined))
  );
});
