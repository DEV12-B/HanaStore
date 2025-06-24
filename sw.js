// Service Worker for Hana Store
// Basic service worker for caching and offline functionality

const CACHE_NAME = 'hana-store-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/pages/shop.html',
  '/pages/about.html',
  '/pages/contact.html',
  '/pages/login.html',
  '/pages/admin.html',
  '/pages/add-products.html',
  '/pages/admin-management.html',
  '/pages/setup-admin.html',
  '/styles/styles.css',
  '/scripts/script.js',
  '/scripts/admin-management.js',
  '/scripts/add-sample-products.js',
  '/scripts/setup-first-admin.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
}); 