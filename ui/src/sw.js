/* eslint-disable */

// documentation: https://developers.google.com/web/tools/workbox/modules/workbox-sw
importScripts('/app/3rdparty/workbox/workbox-sw.js')

workbox.setConfig({
  modulePathPrefix: '/app/3rdparty/workbox/',
  debug: false,
})

workbox.loadModule('workbox-core')
workbox.loadModule('workbox-strategies')
workbox.loadModule('workbox-routing')
workbox.loadModule('workbox-navigation-preload')
workbox.loadModule('workbox-precaching')
workbox.loadModule('workbox-expiration')

workbox.core.clientsClaim()
self.skipWaiting()

const SW_VERSION = '2026-03-23-v2'
console.log('[SW] Service Worker', SW_VERSION, 'initialized')

addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    skipWaiting()
  }
})

const CACHE_NAME = 'offline-html'
// This assumes /offline.html is a URL for your self-contained
// (no external images or styles) offline page.
const FALLBACK_HTML_URL = './offline.html'
// Populate the cache with the offline HTML page when the
// service worker is installed.
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(FALLBACK_HTML_URL)),
  )
})

// Clean up old audio cache on SW activation (audio no longer cached by SW)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.delete('audio-cache-v1').then((deleted) => {
      if (deleted) console.log('[SW] Cleaned up old audio cache')
    }),
  )
})

const networkOnly = new workbox.strategies.NetworkOnly()
const navigationHandler = async (params) => {
  try {
    // Attempt a network request.
    return await networkOnly.handle(params)
  } catch (error) {
    // If it fails, return the cached HTML.
    return caches.match(FALLBACK_HTML_URL, {
      cacheName: CACHE_NAME,
    })
  }
}

// self.__WB_MANIFEST is default injection point
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

// Audio streams: NO interception by SW.
// SW interception adds async delay (cache open, cache match) during track transitions.
// On mobile in background, this delay causes the OS to see "no active audio" and suspend the page.
// Let the browser handle audio requests natively with proper Range/206 support.

// Custom image caching handler - doesn't throw errors offline
const imageHandler = async ({ url, request, event }) => {
  const cache = await caches.open('images-cache-v1')

  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  // Not in cache, try network
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // Offline and not in cache - return empty image or error
    console.log('[SW] Image not in cache and offline:', url.pathname)
    // Return a placeholder 1x1 transparent PNG
    return new Response(
      new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
        0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4e, 0x44, 0xae,
      ]),
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'image/png' },
      },
    )
  }
}

// Cache album artwork and images
workbox.routing.registerRoute(({ url }) => {
  return (
    (url.pathname.includes('/api/album/') && url.pathname.includes('/cover')) ||
    url.pathname.includes('/rest/getCoverArt')
  )
}, imageHandler)

// Custom API handler - CacheFirst for GET, NetworkOnly for POST
const apiHandler = async ({ url, request, event }) => {
  // Only cache GET requests
  if (request.method !== 'GET') {
    try {
      return await fetch(request)
    } catch (error) {
      // Silently fail write operations when offline
      console.log('[SW] Offline - ignoring write request:', url.pathname)
      return new Response(null, {
        status: 503,
        statusText: 'Service Unavailable (offline)',
      })
    }
  }

  // For GET requests, try cache first
  const cache = await caches.open('api-cache-v1')
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    // Update cache in background
    event.waitUntil(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            cache.put(request, response.clone())
          }
        })
        .catch(() => {}),
    )
    return cachedResponse
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.error('[SW] API fetch failed:', url.pathname)
    throw error
  }
}

// NetworkFirst handler for dynamic data that changes frequently
const networkFirstHandler = async ({ url, request, event }) => {
  const cache = await caches.open('api-cache-v1')

  try {
    // Try network first
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    // Fallback to cache if offline
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Wrapped API - always fetch fresh data (NetworkFirst)
workbox.routing.registerRoute(({ url }) => {
  return url.pathname.startsWith('/api/wrapped/')
}, networkFirstHandler)

// Cache API metadata (songs, albums, playlists)
workbox.routing.registerRoute(({ url }) => {
  return (
    (url.pathname.startsWith('/api/') || url.pathname.startsWith('/rest/')) &&
    !url.pathname.includes('/stream') &&
    !url.pathname.includes('/keepalive') &&
    !url.pathname.startsWith('/api/wrapped/')
  )
}, apiHandler)

// Register navigation handler LAST - after all other routes
// This ensures that API and asset routes are handled first
workbox.routing.registerRoute(
  new workbox.routing.NavigationRoute(navigationHandler),
)
