// Dedicated Nebula PWA Service Worker for Offline App Caching
// Note: This worker is completely separate from public/sw.js (reserved for ad network)

const CACHE_NAME = "nebula-pwa-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/nebula-icon.png",
  "/nebula-favicon.png",
  "/nebula-og-image.png",
  "/no-image.svg"
];

// Install event - cache core shell assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[PWA-SW] Failed to cache initial assets:", err);
      });
    })
  );
});

// Activate event - clean up old caches if any
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith("nebula-pwa-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Stale-While-Revalidate for app shell and static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, API proxies, stream endpoints, extensions, and ad domains
  if (
    request.method !== "GET" ||
    url.protocol === "chrome-extension:" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("3nbf4.com") ||
    url.hostname.includes("tmdb.org") ||
    url.hostname.includes("fanart.tv")
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fetch fails (offline), return cached response or fallback to root index.html for navigation
          if (request.mode === "navigate") {
            return caches.match("/index.html") || caches.match("/");
          }
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
