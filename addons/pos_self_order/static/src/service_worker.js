// Part of Odoo. See LICENSE file for full copyright and licensing details.

// Minimum Service Worker implementation for POS Self Order PWA
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    clients.claim();
});

self.addEventListener('fetch', (event) => {
    // For now, let all requests pass through to the network
    // Add caching strategies as needed
});
