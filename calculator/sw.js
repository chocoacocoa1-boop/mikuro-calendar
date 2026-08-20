// みくろん電卓のService Worker
// キャッシュを更新したいときは CACHE_NAME のバージョン番号を上げること
const CACHE_NAME = 'mikuron-calculator-v3';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './mikuro-nee.webp',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k.startsWith('mikuron-calculator-') && k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});
