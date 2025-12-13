// Nome do cache
const CACHE_NAME = 'ac-transporte-v1';

// Arquivos para cache
const urlsToCache = [
    '/',
    '/index.html',
    '/motorista.html',
    '/passageiro.html',
    '/admin.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/assets/logo.jpg',
    '/assets/avatar.png'
];

// Instalar Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - retorna resposta do cache
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});

// Atualizar Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
