// service-worker.js
const CACHE_NAME = 'english-reading-v1';
const AUDIO_CACHE = 'audio-cache-v1';
const SITE_VERSION = 'v1.0.1';

// 需要預先快取的檔案（改為相對路徑）
const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './finishSignUp.html',
  './data/units-index.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== AUDIO_CACHE)
          .map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // 忽略非 HTTP 請求
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // 🔥 新增：忽略帶有查詢參數的請求（如 ?unit=xxx）
  if (url.search && url.search !== '') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 登入/登出頁面特殊處理：永遠網路優先
  if (url.pathname.includes('/login.html') || url.pathname.includes('/logout.html')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // 音頻檔案：快取優先，並主動存入 AUDIO_CACHE
  if (url.pathname.includes('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(cache => {
        return cache.match(event.request).then(cached => {
          if (cached) {
            return cached;
          }
          return fetch(event.request).then(networkRes => {
            if (networkRes && networkRes.status === 200 && event.request.method === 'GET') {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          }).catch(err => {
            console.error('音頻下載失敗', err);
            return new Response('音頻載入失敗', { status: 404 });
          });
        });
      })
    );
    return;
  }
  
  // 其他請求：網路優先，只快取 GET 請求
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return fetch(event.request).then(networkRes => {
        if (event.request.method === 'GET') {
          cache.put(event.request, networkRes.clone());
        }
        return networkRes;
      }).catch(() => {
        return cache.match(event.request);
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PREFETCH_AUDIO') {
    const { url } = event.data;
    if (url) {
      caches.open(AUDIO_CACHE).then(cache => {
        fetch(url).then(res => {
          if (res.ok) cache.put(url, res);
        }).catch(() => {});
      });
    }
  }
});