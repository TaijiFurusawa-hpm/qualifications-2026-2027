/* TOEIC学習アプリ Service Worker
   - 本体・data.js: ネット優先→失敗時キャッシュ
   - 音声(audio/): 再生時にキャッシュ。Rangeリクエスト(Safari等)はキャッシュ済み全体から切り出して返す */
const VERSION = 'toeic-quiz-v3';
const CORE = ['./index.html','./manifest.webmanifest','./data/data.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(CORE.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function rangeFromCache(req, res) {
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const buf = await res.arrayBuffer();
  const size = buf.byteLength;
  let start = m && m[1] !== '' ? parseInt(m[1], 10) : 0;
  let end = m && m[2] !== '' ? parseInt(m[2], 10) : size - 1;
  if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' }
  });
}

async function audioFetch(req) {
  const cache = await caches.open(VERSION);
  const key = new Request(req.url);
  const hit = await cache.match(key);
  if (hit) return req.headers.get('range') ? rangeFromCache(req, hit) : hit;
  // 未キャッシュ: 全体を取得して保存し、以後オフラインで使えるようにする
  try {
    const full = await fetch(key);
    if (full.ok) {
      cache.put(key, full.clone()).catch(() => {});
      return req.headers.get('range') ? rangeFromCache(req, full) : full;
    }
    return full;
  } catch (err) {
    return fetch(req);
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/audio/')) { e.respondWith(audioFetch(req)); return; }
  // 本体・data.js・その他: ネット優先→キャッシュ
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(h => h || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
