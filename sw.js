const CACHE = "casino-v27";
const FILES = [
  "/casino/",
  "/casino/index.html",
  "/casino/style.css?v=27",
  "/casino/app.js?v=27",
  "/casino/manifest.json",
  "/casino/shops.json",
  "/casino/icon-192.png",
  "/casino/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .catch(err => console.log("Service worker install cache error:", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE)
          .then(cache => cache.put(event.request, clone))
          .catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/casino/index.html");
          if (fallback) return fallback;
        }

        return Response.error();
      })
  );
});
