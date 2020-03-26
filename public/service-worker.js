// reference https://libra-nk.net/sw-cash-strategy/
var CACHE_NAME = "qrcode-generator-cache-104";
var filesToCache = [
  "/",
  "/index.html",
  "/main.css",
  "/main.js",
  "/components.css"
];


function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (response) {
      var fetchPromise = fetch(request).then(function (networkResponse) {
        if (networkResponse.ok) cache.put(request, networkResponse.clone());
        return networkResponse;
      });
      return response || fetchPromise;
    })
  })
}

function cacheFirst(request, cacheName) {
  return event.respondWith(
    caches.open(cacheName).then(function (cache) {
      return cache.match(request).then(function (response) {
        return response || fetch(request).then(function (response) {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
      });
    })
  );
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    if (!navigator.onLine) return cache.match(request);
    return fetch(request).then(function (response) {
      if (response.ok) cache.put(request, response.clone());
      return response;
    }).catch(r => {
      return cache.match(request);
    })
  })
}

function networkOnly(request, cacheName) {
  return fetch(request);
}

function cacheOnly(request, cacheName) {
  return caches.match(request);
}

function getFetchHandler(url) {
  return staleWhileRevalidate;
}


self.addEventListener('fetch', function (event) {
  const handler = getFetchHandler(new URL(event.request.url)) || networkOnly;
  event.respondWith(handler(event.request, CACHE_NAME));
});

self.addEventListener("install", function (e) {
  console.log(`service worker installed`);
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(filesToCache);
    })
  );
});

self.addEventListener("activate", e => {
  console.log(`service worker activated`);
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
      );
    })
  );
});
