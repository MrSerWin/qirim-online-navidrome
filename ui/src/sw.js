/* eslint-disable */

// Minimal Service Worker — required for PWA install, no request interception.
// All network requests (audio, API, SSE events, images) go directly to server.

importScripts('/app/3rdparty/workbox/workbox-sw.js')

workbox.setConfig({
  modulePathPrefix: '/app/3rdparty/workbox/',
  debug: false,
})

workbox.loadModule('workbox-precaching')

// Required by vite-plugin-pwa injectManifest
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

self.skipWaiting()
self.addEventListener('activate', (event) => {
  // Clean up ALL old caches from previous SW versions
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !name.startsWith('workbox-precache'))
          .map((name) => caches.delete(name)),
      ),
    ),
  )
  self.clients.claim()
})

addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
