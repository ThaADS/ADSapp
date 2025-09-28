// Service Worker for ADSapp PWA
const CACHE_NAME = 'adsapp-v1.0.0';
const OFFLINE_URL = '/offline';

// URLs to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/dashboard/inbox',
  '/dashboard/contacts',
  '/dashboard/analytics',
  '/dashboard/automation',
  '/offline',
  '/manifest.json',
  // Add your static assets here
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// URLs to cache on first visit
const DYNAMIC_CACHE_URLS = [
  '/api/',
  '/dashboard/',
  '/_next/static/',
  '/_next/image'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.pathname.startsWith('/_next/image')) {
    // Images - cache first with fallback
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Pages - stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Network first strategy (good for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If it's an API request and we have no cache, return offline response
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are currently offline. Please check your connection.'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Cache first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch and cache:', request.url);
    throw error;
  }
}

// Stale while revalidate strategy (good for pages)
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);

  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(CACHE_NAME);
        cache.then(c => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => {
      // Network failed, return cached version or offline page
      if (!cachedResponse) {
        return caches.match(OFFLINE_URL);
      }
    });

  return cachedResponse || networkResponsePromise;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  }

  if (event.tag === 'background-sync-contacts') {
    event.waitUntil(syncContacts());
  }
});

// Sync queued messages when back online
async function syncMessages() {
  try {
    // Get queued messages from IndexedDB
    const queuedMessages = await getQueuedMessages();

    for (const message of queuedMessages) {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });

        // Remove from queue after successful send
        await removeFromQueue('messages', message.id);

        // Notify clients of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'MESSAGE_SYNCED',
              data: message
            });
          });
        });
      } catch (error) {
        console.error('[SW] Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync queued contacts when back online
async function syncContacts() {
  try {
    const queuedContacts = await getQueuedContacts();

    for (const contact of queuedContacts) {
      try {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact)
        });

        await removeFromQueue('contacts', contact.id);

        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'CONTACT_SYNCED',
              data: contact
            });
          });
        });
      } catch (error) {
        console.error('[SW] Failed to sync contact:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Contact sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');

  const options = {
    body: 'You have a new message',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'message-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply-icon.png'
      },
      {
        action: 'mark-read',
        title: 'Mark as Read',
        icon: '/icons/read-icon.png'
      }
    ],
    data: {
      url: '/dashboard/inbox'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data.messageId = data.messageId;
      options.data.contactId = data.contactId;
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('ADSapp', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'reply') {
    // Open reply interface
    event.waitUntil(
      clients.openWindow('/dashboard/inbox?action=reply&id=' + event.notification.data.messageId)
    );
  } else if (event.action === 'mark-read') {
    // Mark message as read
    event.waitUntil(
      fetch('/api/messages/' + event.notification.data.messageId + '/read', {
        method: 'PUT'
      })
    );
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/dashboard/inbox')
    );
  }
});

// Share target handling
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  const formData = await request.formData();
  const title = formData.get('title');
  const text = formData.get('text');
  const url = formData.get('url');
  const files = formData.getAll('media');

  // Store shared data for the app to access
  const sharedData = {
    title,
    text,
    url,
    files: files.map(file => ({
      name: file.name,
      type: file.type,
      size: file.size
    }))
  };

  // Store in cache for app to retrieve
  const cache = await caches.open(CACHE_NAME);
  await cache.put('/shared-data', new Response(JSON.stringify(sharedData)));

  // Redirect to share handler page
  return Response.redirect('/dashboard/inbox?shared=true', 302);
}

// Utility functions for IndexedDB operations
async function getQueuedMessages() {
  // Implement IndexedDB retrieval for queued messages
  return [];
}

async function getQueuedContacts() {
  // Implement IndexedDB retrieval for queued contacts
  return [];
}

async function removeFromQueue(type, id) {
  // Implement IndexedDB removal
  console.log(`[SW] Removing ${type} ${id} from queue`);
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(periodicSync());
  }
});

async function periodicSync() {
  console.log('[SW] Periodic sync triggered');

  try {
    // Sync any pending data
    await syncMessages();
    await syncContacts();

    // Clean up old cache entries
    await cleanupCache();
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}

async function cleanupCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();

  // Remove old entries (older than 7 days)
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader && new Date(dateHeader).getTime() < oneWeekAgo) {
        await cache.delete(key);
        console.log('[SW] Removed old cache entry:', key.url);
      }
    }
  }
}

console.log('[SW] Service Worker loaded');