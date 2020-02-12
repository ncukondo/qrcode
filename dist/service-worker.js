var CACHE_NAME = "qrcode-generator-cache-102";
var USING_CACHE = true;
var filesToCache = [
  "/",
  "/index.html",
  "/main.css",
  "/main.js",
  "/components.css",
  "https://fonts.googleapis.com/css?family=Oswald|Roboto&display=swap"
];
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

self.addEventListener('fetch', function (event) {
  var online = navigator.onLine;
  if (!USING_CACHE) return;

  if (online) {
    event.respondWith(
      caches.match(event.request)
        .then(
          function (response) {
            if (response) {
              return response;
            }
            return fetch(event.request)
              .then(function (response) {
                cloneResponse = response.clone();
                if (response && response.status == 200) {
                  caches.open(CACHE_NAME)
                    .then(function (cache) {
                      cache.put(event.request, cloneResponse)
                        .then(function () {
                        });
                    });
                }
                return response;
              }).catch(function (error) {
                return console.log(error);
              });
          })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          if (response) {
            return response;
          }
          return caches.match("offline.html")
            .then(function (responseNodata) {
              return responseNodata;
            });
        }
        )
    );
  }
});
