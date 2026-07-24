const CACHE_NAME = "yic-v3";

self.addEventListener("install", (e) => {
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

  // Never cache API calls or navigation requests
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/users") ||
      url.pathname.startsWith("/schedules") || url.pathname.startsWith("/invoices") ||
      url.pathname.startsWith("/classrooms") || url.pathname.startsWith("/groups") ||
      url.pathname.startsWith("/dashboard") || url.pathname.startsWith("/search") ||
      url.pathname.startsWith("/admin") || url.pathname.startsWith("/messages")) {
    return;
  }

  // Network-first for HTML pages
  if (e.request.mode === "navigate" || url.pathname === "/") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, images)
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
