/**
 * AgriFinance service worker — app-shell caching only.
 *
 * Deliberately does NOT intercept /api/* requests: the write-queue and
 * read-cache for actual farm data live in IndexedDB via offline-db.js /
 * api.js, which can make smarter decisions (e.g. per-record queuing,
 * excluding auth/AI-chat) than a generic fetch-handler can. This worker's
 * one job is making sure the app itself — every page, the stylesheet, every
 * script — still loads with zero network, which is what makes the app
 * installable and usable at all when a farmer has no signal.
 */
const CACHE_NAME = 'agrifinance-shell-v1';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/register.html',
  '/dashboard.html',
  '/ledger.html',
  '/crops.html',
  '/livestock.html',
  '/forecast.html',
  '/roi.html',
  '/admin.html',
  '/marketplace.html',
  '/community.html',
  '/manifest.json',
  '/favicon.svg',
  '/css/style.css',
  '/js/api.js',
  '/js/offline-db.js',
  '/js/nav.js',
  '/js/toast.js',
  '/js/modal.js',
  '/js/chart.js',
  '/js/scenes.js',
  '/js/voice-input.js',
  '/js/assistant.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch API calls or cross-origin requests (weather, fonts, etc.) —
  // those are handled by api.js's own IndexedDB layer or should just fail
  // normally when offline.
  if (url.pathname.startsWith('/api/') || url.origin !== location.origin) return;

  // App shell: cache-first, falling back to network, so the app opens
  // instantly offline and still self-heals when a new file is deployed.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match('/index.html'));
      return cached || networkFetch;
    })
  );
});
