/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();

cleanupOutdatedCaches();

// Interceptar requests a /version.json ANTES del precache para evitar que se cachee
// Esto asegura que siempre se obtenga la versión más reciente desde la red
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/version.json' || url.pathname.endsWith('/version.json')) {
    // Para /version.json, siempre ir a la red sin usar caché
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      }).catch(() => {
        // Si falla la red, devolver error en lugar de usar caché
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }
});

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: any = null;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Hogares', body: event.data.text() };
  }

  const title = payload?.title ?? 'Hogares';
  const body = payload?.body ?? '';
  const url = payload?.url ?? '/activity';
  const tag = payload?.tag ?? 'activity';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: { url },
      badge: '/pwa-192.png',
      icon: '/pwa-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification as any)?.data?.url || '/activity';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          const c = client as WindowClient;
          try {
            await c.navigate(url);
          } catch {
            // ignore
          }
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
