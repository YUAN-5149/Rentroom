/**
 * 家管小屋 · Service Worker
 *
 * 策略：
 *  - install: 預先快取 app shell（HTML + manifest + icons）
 *  - activate: 清除舊版快取
 *  - fetch:
 *     - 同站 navigation（HTML 路由）→ network-first，失敗時回退到 cache 中的 index.html
 *     - 同站 static asset（JS/CSS/icon）→ stale-while-revalidate
 *     - 跨站（CDN、Google Fonts、Drive thumbnail、Apps Script API）→ network-first，不快取（避免資料變舊）
 *     - 但 Google Fonts CSS / Font 檔可 stale-while-revalidate
 */

const VERSION = 'v1.0.0';
const APP_CACHE  = `home-care-app-${VERSION}`;
const ASSET_CACHE = `home-care-assets-${VERSION}`;
const FONT_CACHE = `home-care-fonts-${VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-512.svg',
  './icon-maskable.svg',
  './apple-touch-icon.svg',
];

// === INSTALL: 預先快取 app shell ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// === ACTIVATE: 清除舊版本快取 ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_CACHE, ASSET_CACHE, FONT_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// === Helper：判斷請求類型 ===
const isNavigation = (req) => req.mode === 'navigate';
const isSameOrigin = (url) => url.origin === self.location.origin;
const isGoogleFont = (url) =>
  url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';
const isAppsScriptApi = (url) => url.origin === 'https://script.google.com';
const isDriveImage = (url) =>
  url.hostname.endsWith('googleusercontent.com') ||
  url.hostname === 'drive.google.com';

// === FETCH ===
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. 同站導覽：network-first，斷網時回退 index.html
  if (isNavigation(req)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match('./index.html', { ignoreSearch: true }).then((m) => m || caches.match('./'))
        )
    );
    return;
  }

  // 2. Google Fonts：stale-while-revalidate
  if (isGoogleFont(url)) {
    event.respondWith(staleWhileRevalidate(req, FONT_CACHE));
    return;
  }

  // 3. Apps Script API：永遠走網路（不快取，資料要新鮮）
  if (isAppsScriptApi(url)) {
    return; // 預設行為 = passthrough，瀏覽器自己處理
  }

  // 4. Drive 縮圖：cache-first（變動少，加快重複載入）
  if (isDriveImage(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  // 5. 同站靜態資源：stale-while-revalidate
  if (isSameOrigin(url)) {
    event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
    return;
  }

  // 6. 其他跨站資源：network-first，無快取
});

// === 快取策略：stale-while-revalidate ===
function staleWhileRevalidate(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
}

// === 快取策略：cache-first ===
function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then((cache) =>
    cache.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      });
    })
  );
}

// === 接收 client 端推送的「立即更新」訊息 ===
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
