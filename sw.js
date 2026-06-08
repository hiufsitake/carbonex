// CARBONEX Portal — service worker (required for PWA installability).
// Network-only: always loads the freshest content, never serves stale cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  // A fetch handler must exist for the app to be installable.
  // Go straight to the network so updates are always picked up.
  e.respondWith(fetch(e.request));
});
