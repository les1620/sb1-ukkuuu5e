// Service Worker pour Bible Compagnon
const CACHE_NAME = 'bible-compagnon-v1';
const urlsToCache = [
    '/app.html',
    '/index.html',
    '/js/app.js',
    '/data/bible.json',
    '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache ouvert');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Erreur lors de la mise en cache:', err);
            })
    );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retourner la réponse du cache
                if (response) {
                    return response;
                }

                // Clone de la requête
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Vérifier si la réponse est valide
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone de la réponse
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // En cas d'erreur réseau, retourner une page de fallback
                return caches.match('/app.html');
            })
    );
});
