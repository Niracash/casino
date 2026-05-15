const CACHE = "casino-v3";

const FILES = [
  "/casino/",
  "/casino/index.html",
  "/casino/style.css",
  "/casino/app.js",
  "/casino/manifest.json",
  "/casino/icon-192.png",
  "/casino/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .catch(err => console.log(err))
  );

  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key=>{
          if(key!==CACHE){
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const clone=response.clone();

        caches.open(CACHE)
          .then(cache=>cache.put(event.request,clone));

        return response;
      })
      .catch(()=>{
        return caches.match(event.request);
      })
  );
});
