const CACHE = 'multask-cache';
const FILES = [
    './',
    './index.html',
    './index-style.css',
    './functions/localStorage/storage.js',
    './functions/economy.js',
    './functions/calendar.js',
    './functions/calendar-day.js',
    './functions/cutclips.js'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(FILES))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});