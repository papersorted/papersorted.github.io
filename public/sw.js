const CACHE_NAME = 'ku-papers-v2';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache only the essentials so the app loads offline instantly
      return cache.addAll([
        '/',
        '/favicon.png',
        '/manifest.webmanifest'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Stale-while-revalidate for everything else to ensure high performance
  e.respondWith(
    caches.match(e.request).then((response) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        // Don't cache PDFs or non-GET requests
        if (e.request.method !== 'GET' || e.request.url.includes('.pdf') || !e.request.url.startsWith('http')) {
          return networkResponse;
        }
        
        let responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        // Ignore fetch errors during offline
      });
      return response || fetchPromise;
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});
