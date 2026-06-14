/* CFP弱点克服クイズ Service Worker
   - オフライン対応: 一度オンラインで開けば、本体・フォント・アイコンをキャッシュし機内モードでも起動可能
   - 更新方式: HTML/JSはネット優先(最新を拾う)→失敗時キャッシュ。フォント等はキャッシュ優先 */
const VERSION = 'cfp-quiz-v1';
const CORE = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  // CORE は addAll。一部失敗(例:'./' と './index.html' の重複等)でも致命にしない
  e.waitUntil(
    caches.open(VERSION).then(c =>
      Promise.allSettled(CORE.map(u => c.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // ページ遷移(HTML): ネット優先→キャッシュ(オフライン時)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy)).catch(()=>{});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // それ以外(フォント・アイコン等): キャッシュ優先→ネット取得しランタイムキャッシュ
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        // クロスオリジン(Google Fonts)はopaqueでもキャッシュして次回オフラインで使えるようにする
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(() => hit);
    })
  );
});
