// Service Worker do PLUGUE PWA
// Versão do Cache (v2 - corrige bypass de chunks Next.js e previne TypeError Response)
const CACHE_NAME = 'plugue-pwa-v2';
const OFFLINE_URL = '/offline.html';

// Recursos essenciais para pré-cache offline (apenas assets verdadeiramente estáticos, sem '/')
const PRECACHE_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignora requisições que não sejam GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignora extensões do Chrome e esquemas não suportados
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. IMPORTANTE: Ignora totalmente requisições internas do Next.js (_next/static, _next/data)
  // O Next.js já possui versionamento próprio imutável por hash.
  // Evita ChunkLoadError e TypeError: Failed to convert value to 'Response' entre novos deploys.
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // 2. Requisições de navegação (páginas HTML) - Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('Você está offline no PLUGUE.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Requisições de API (/api/*) - Network First com fallback JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response(JSON.stringify({ 
          error: 'Você está offline. Operação indisponível sem conexão.', 
          offline: true 
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // 4. Recursos estáticos públicos (ícones, manifest, imagens gerais)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Revalidação assíncrona em background se já estiver no cache
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse.clone()));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Se não estiver no cache, busca na rede garantindo retorno de Response válida
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Suporte a mensagens enviadas da interface (ex: skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
