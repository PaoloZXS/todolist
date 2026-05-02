// IMPORTANTE: incrementare la versione (v3 -> v4 -> v5...) a ogni push/deploy
// che modifica HTML/CSS/JS/manifest/icone, per forzare refresh corretto su mobile.
const CACHE_NAME = "cose-da-fare-cache-v5";
const ASSETS = [
  "/",
  "/index.html",
  "/login/login.html",
  "/todos/todos.html",
  "/css/base.css",
  "/login/login.css",
  "/todos/todos.css",
  "/js/session.js",
  "/js/turso-api.js",
  "/manifest.json",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkFirst(request) {
  return (
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.url.endsWith(".html") ||
    request.url.endsWith(".js") ||
    request.url.endsWith(".css") ||
    request.url.endsWith("/manifest.json")
  );
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isNetworkFirst(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            if (event.request.method === "GET") {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
        .catch(() =>
          caches.match(event.request).then((cacheResponse) => {
            return cacheResponse || caches.match("/index.html");
          })
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cacheResponse) => {
      return (
        cacheResponse ||
        fetch(event.request)
          .then((networkResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              if (event.request.method === "GET") {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          })
          .catch(() => caches.match("/index.html"))
      );
    })
  );
});
