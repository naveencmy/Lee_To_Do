// ═══════════════════════════════════════════════════════════════
// Service Worker — Push Notifications + Offline Cache
// This runs in the background even when the app is closed
// Enables WhatsApp-style notifications on Windows, Android, iOS
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = 'lee-todo-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/favicon.svg',
];

// ── Install: Cache static assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: Clean old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first, fallback to cache ──
self.addEventListener('fetch', (event) => {
  // Skip non-GET and API requests
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ═══════════════════════════════════════════════════════════════
// PUSH NOTIFICATION HANDLER
// This is what makes notifications work like WhatsApp:
// - Shows native OS notification (Windows Action Center, iOS/Android tray)
// - Works even when browser tab is closed
// - Supports action buttons (Open Board / Dismiss)
// ═══════════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  let data = {
    title: 'Lee To-Do',
    body: 'You have task updates!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'default',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'default',
    renotify: data.renotify || false,
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200], // Vibrate pattern for mobile
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: ' Open Board' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    // Windows-specific: shows in Action Center
    // Android: shows in notification tray with sound
    // iOS (PWA): shows in Notification Center
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Handle notification click ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // Open new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Handle notification close ──
self.addEventListener('notificationclose', (event) => {
  // Analytics: track dismissed notifications if needed
  console.log('Notification dismissed:', event.notification.tag);
});
