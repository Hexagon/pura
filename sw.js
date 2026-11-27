// Pura service worker: offline support, installability and the Android share target.
// App files are network-first (so a deploy shows up on the next load) with the cache as offline
// fallback; the version-pinned image library on the CDN is cache-first.
const VERSION = 'pura-v1';
const SHARE_CACHE = 'pura-share';
const SHELL = [
    './', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
    'js/constants.js', 'js/state.js', 'js/layers.js', 'js/drawing.js', 'js/selection.js',
    'js/effects.js', 'js/file-io.js', 'js/history.js', 'js/metadata.js', 'js/ui.js',
    'img/pura.png', 'img/icons/favicon.svg', 'img/icons/icon-192.png', 'img/icons/icon-512.png'
];
const CDN_PREFIX = 'https://cdn.jsdelivr.net/npm/cross-image@';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        for (const key of await caches.keys()) {
            if (key !== VERSION && key !== SHARE_CACHE) await caches.delete(key);
        }
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share-target')) {
        event.respondWith(receiveShare(request));
        return;
    }
    if (request.method !== 'GET') return;

    if (url.href.startsWith(CDN_PREFIX)) {
        event.respondWith(cacheFirst(request));
    } else if (url.origin === location.origin) {
        event.respondWith(networkFirst(request));
    }
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
        return response;
    } catch (err) {
        const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const shell = await caches.match('index.html');
            if (shell) return shell;
        }
        throw err;
    }
}

// Files shared to the installed app are parked in a cache; the page picks them up on load
async function receiveShare(request) {
    const form = await request.formData();
    const cache = await caches.open(SHARE_CACHE);
    let i = 0;
    for (const file of form.getAll('images')) {
        if (!(file instanceof File)) continue;
        await cache.put(`shared/${Date.now()}-${i++}`, new Response(file, {
            headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) }
        }));
    }
    return Response.redirect('./?shared=1', 303);
}
