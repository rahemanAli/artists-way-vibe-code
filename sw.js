const CACHE_NAME = 'artist-way-v1.8'; // New Logo v2
const URLS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './data.js',
    './logo-v3.png',
    './manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://esm.sh/react@18.2.0',
    'https://esm.sh/react-dom@18.2.0/client',
    'https://esm.sh/htm@3.1.1'
];

// Install: Cache files, then skip waiting to activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Critical: Activate immediately
    );
});

// Activate: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Critical: Take control immediately
    );
});

// Fetch: NETWORK FIRST for local files (app.js, html), CACHE FIRST for libs
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Check if it's a local file (our code)
    const isLocal = url.origin === location.origin;

    if (isLocal) {
        // Network First (Fall back to cache if offline)
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Update cache with new version
                    const resClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resClone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Cache First (Libraries, etc.)
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) return response;
                    return fetch(event.request);
                })
        );
    }
});
