const ACTIVE_CACHE = 'fa-calc-active-v1';
const STAGED_CACHE = 'fa-calc-staged-v1';
const SW_VERSION = '1.9.1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(ACTIVE_CACHE).then(async (activeCache) => {
      const existing = await activeCache.match('./index.html');
      if (!existing) {
        await activeCache.addAll(ASSETS);
      } else {
        const stagedCache = await caches.open(STAGED_CACHE);
        await stagedCache.addAll(ASSETS);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'APPLY_UPDATE' || event.data.type === 'SKIP_WAITING')) {
    event.waitUntil(
      (async () => {
        const activeCache = await caches.open(ACTIVE_CACHE);
        const stagedCache = await caches.open(STAGED_CACHE);
        for (const asset of ASSETS) {
          const stagedResp = await stagedCache.match(asset);
          if (stagedResp) {
            await activeCache.put(asset, stagedResp.clone());
          }
        }
        await caches.delete(STAGED_CACHE);
        await self.skipWaiting();
      })()
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== ACTIVE_CACHE && key !== STAGED_CACHE).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.searchParams.has('_sw_check') || url.searchParams.has('_sw_apply')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.open(ACTIVE_CACHE).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => cache.match('./index.html'));
      });
    })
  );
});