// 子みくろんのおうち サービスワーカー
// 中身を変えたら CACHE_NAME の番号を上げること（js/main.js の APP_VER もいっしょに）
const CACHE_NAME = 'komikuron-ouchi-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-180.png',
    './icon-192.png',
    './icon-512.png',
    './icon-maskable-512.png',
    './lib/three.module.min.js',
    './lib/OrbitControls.js',
    './js/agent.js',
    './js/audio.js',
    './js/ball.js',
    './js/build.js',
    './js/chatter.js',
    './js/clawd.js',
    './js/convos.js',
    './js/ctx.js',
    './js/env.js',
    './js/family.js',
    './js/fx.js',
    './js/garden.js',
    './js/house.js',
    './js/life.js',
    './js/lines.js',
    './js/main.js',
    './js/nav.js',
    './js/state.js',
    './js/textures.js',
    './js/ui.js',
    './js/util.js',
];

self.addEventListener('install', (event) => {
    // ブラウザのHTTPキャッシュ（GitHub Pagesは10分）に残った古いファイルを拾わないよう、必ず取り直す
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))));
    self.skipWaiting();
});

// 自分の古いキャッシュだけ消す（カレンダーや電卓のキャッシュは消さない）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k.startsWith('komikuron-ouchi-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
});
