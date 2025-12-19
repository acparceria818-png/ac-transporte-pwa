// service-worker.js - Atualizado para Background Sync
const CACHE_NAME = 'ac-transporte-v10-' + new Date().getTime();
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './logo.jpg'
];

// Install
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate
self.addEventListener('activate', event => {
  console.log('✅ Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Ignorar Firebase e analytics
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google-analytics')) {
    return;
  }
  
  // Estratégia: Cache First, depois Network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(networkResponse => {
            // Não cachear respostas inválidas
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clonar resposta para cache
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Cachear apenas nossos recursos
                if (url.origin === self.location.origin) {
                  cache.put(event.request, responseToCache);
                }
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Fallback para página offline
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background Sync para pontos offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pontos-offline') {
    console.log('🔄 Sincronizando pontos offline...');
    
    event.waitUntil(
      syncPontosOffline()
    );
  }
});

// Sincronizar pontos offline
async function syncPontosOffline() {
  try {
    const cache = await caches.open('pontos-offline');
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      const ponto = await response.json();
      
      // Enviar para o servidor
      await sendToServer(ponto);
      
      // Remover do cache
      await cache.delete(request);
    }
    
    console.log('✅ Pontos offline sincronizados');
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Enviar para servidor (simulado)
async function sendToServer(ponto) {
  // Implementar envio real para Firebase
  console.log('Enviando ponto:', ponto);
  return Promise.resolve();
}

// Push Notifications
self.addEventListener('push', event => {
  let options = {
    body: 'Nova notificação do AC Transporte',
    icon: './logo.jpg',
    badge: './logo.jpg',
    vibrate: [100, 50, 100],
    data: { url: './' }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data = { ...options.data, ...data };
    } catch (e) {
      options.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('AC Transporte', options)
  );
});

// Notification Click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});
