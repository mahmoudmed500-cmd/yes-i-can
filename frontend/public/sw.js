const CACHE_NAME = "yic-v1";
const PRECACHE = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never cache API calls
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/users") ||
      url.pathname.startsWith("/schedules") || url.pathname.startsWith("/invoices") ||
      url.pathname.startsWith("/classrooms") || url.pathname.startsWith("/groups") ||
      url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/search")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetched = fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
