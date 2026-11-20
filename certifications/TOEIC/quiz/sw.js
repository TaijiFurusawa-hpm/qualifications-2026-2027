/* TOEIC学習アプリ Service Worker
   - 本体・data.js: ネット優先→失敗時キャッシュ
   - 写真(img/): インストール時に data.js に書かれた写真をすべて保存し、以後はキャッシュ優先
     （ファイル名が問題IDで固定のため。差し替え時は VERSION を上げる）
   - 音声(audio/): 再生時にキャッシュ。Rangeリクエスト(Safari等)はキャッシュ済み全体から切り出して返す
   - Web 版だけで登録する（Capacitor のアプリの中では登録しない。js/app.js の boot()）
   - 書体（fonts/）は同梱。css の url(...) から拾って保存する */
const VERSION = 'toeic-quiz-v14';
/* 本体の一覧は index.html（<script src>・<link href>）と、そこで読む css の url(...)（書体・紙の質感）から作る。
   ファイルを足しても SW を書きかえ忘れないように。どこにも書かれないもの（アイコン・自己テスト）だけをここに置く */
const CORE_STATIC = ['./','./index.html','./manifest.webmanifest','./js/selftest.js','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
const sameOrigin = u => !/^(?:[a-z]+:)?\/\//i.test(u) && !u.startsWith('data:');   // 別オリジン・data: は保存しない
function coreFromIndex(html) {
  return [...html.matchAll(/<(?:script[^>]*\ssrc|link[^>]*\shref)="([^"]+)"/g)].map(m => m[1]).filter(sameOrigin)
    .map(u => u.startsWith('./') ? u : './' + u.replace(/^\//, ''));
}
// css の中の url(...) は css のある場所からの相対
function urlsFromCss(css, cssPath) {
  return [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(m => m[1]).filter(sameOrigin)
    .map(u => new URL(u, new URL(cssPath, self.registration.scope)).href);
}

async function precache() {
  const c = await caches.open(VERSION);
  await Promise.allSettled(CORE_STATIC.map(u => c.add(u)));
  const idx = await c.match('./index.html');
  const core = idx ? coreFromIndex(await idx.text()) : [];
  await Promise.allSettled(core.map(u => c.add(u)));
  const fromCss = [];
  for (const u of core.filter(u => u.endsWith('.css'))) {
    const r = await c.match(u);
    if (r) fromCss.push(...urlsFromCss(await r.text(), u));
  }
  await Promise.allSettled([...new Set(fromCss)].map(u => c.add(u)));
  // 写真は少量（1枚約0.1MB）なので、オフラインで初めて開いても出るよう先に保存する
  const res = await c.match('./data/data.js');
  const imgs = res ? [...new Set((await res.text()).match(/img\/[\w.-]+\.jpg/g) || [])] : [];
  await Promise.allSettled(imgs.map(u => c.add('./' + u)));
}

self.addEventListener('install', e => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
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

async function cacheFirst(req) {
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
  if (url.pathname.includes('/audio/') || url.pathname.includes('/img/')) { e.respondWith(cacheFirst(req)); return; }
  // 本体・data.js・その他: ネット優先→キャッシュ
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req.mode === 'navigate' ? './index.html' : req, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(req).then(h => h || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
