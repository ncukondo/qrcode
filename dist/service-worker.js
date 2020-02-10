var cacheName = "sgtoilet-cache-102";
var filesToCache = [
  "/",
  "/index.html",
  "/main.css",
  "/main.js",
  "/components.css",
  "https://fonts.googleapis.com/css?family=Oswald|Roboto&display=swap"
];
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(cacheName).then(function (cache) {
      return cache.addAll(filesToCache);
    })
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== cacheName)
          .map(key => {
            if (key !== cacheName) {
              return caches.delete(key);
            }
          })
      );
    })
  );
});

self.addEventListener('fetch', function (event) {
  var online = navigator.onLine;

  if (online) {
    event.respondWith(
      caches.match(event.request)
        .then(
          function (response) {
            if (response) {
              return response;
            }
            //ローカルにキャッシュがあればすぐ返して終わりですが、
            //無かった場合はここで新しく取得します
            return fetch(event.request)
              .then(function (response) {
                // 取得できたリソースは表示にも使うが、キャッシュにも追加しておきます
                // ただし、Responseはストリームなのでキャッシュのために使用してしまうと、ブラウザの表示で不具合が起こる(っぽい)ので、複製しましょう
                cloneResponse = response.clone();
                if (response) {
                  //ここ&&に修正するかもです
                  if (response || response.status == 200) {
                    //現行のキャッシュに追加
                    caches.open(cacheName)
                      .then(function (cache) {
                        cache.put(event.request, cloneResponse)
                          .then(function () {
                            //正常にキャッシュ追加できたときの処理(必要であれば)
                          });
                      });
                  } else {
                    //正常に取得できなかったときにハンドリングしてもよい
                    return response;
                  }
                  return response;
                }
              }).catch(function (error) {
                //デバッグ用
                return console.log(error);
              });
          })
    );
  } else {
    //オフラインのときの制御
    event.respondWith(
      caches.match(event.request)
        .then(function (response) {
          // キャッシュがあったのでそのレスポンスを返す
          if (response) {
            return response;
          }
          //オフラインでキャッシュもなかったパターン
          return caches.match("offline.html")
            .then(function (responseNodata) {
              //適当な変数にオフラインのときに渡すリソースを入れて返却
              //今回はoffline.htmlを返しています
              return responseNodata;
            });
        }
        )
    );
  }
});
