const CACHE_NAME = "fire-safety-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(names =>
        Promise.all(
          names
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // หน้าเว็บหลักให้โหลดข้อมูลล่าสุดจากอินเทอร์เน็ตก่อน
  if (
    request.mode === "navigate" ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put("./index.html", response.clone());
            });
          }

          return response;
        })
        .catch(() =>
          caches.match("./index.html")
            .then(response => response || caches.match("./"))
        )
    );

    return;
  }

  // ไฟล์อื่นใช้จาก Cache ก่อน แล้วอัปเดตเบื้องหลัง
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const freshResponse = fetch(request)
          .then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, response.clone());
              });
            }

            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || freshResponse;
      })
    );
  }
});
