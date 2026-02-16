self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

self.addEventListener('fetch', () => {
  // Network-first; no custom caching logic for MVP
});
