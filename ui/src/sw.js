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

console.log('[SW] Service Worker initialized and ready!')

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

// Audio caching constants
const AUDIO_CACHE_NAME = 'audio-cache-v1'
const MAX_AUDIO_CACHE_SIZE = 50 // Maximum number of audio files to cache
const MAX_AUDIO_CACHE_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// Custom audio caching handler
// Fetches full audio file (without Range header) for caching
const audioHandler = async ({ url, request, event }) => {
  const cache = await caches.open(AUDIO_CACHE_NAME)

  // Use song ID as cache key (from ?id= param)
  const songId = url.searchParams.get('id')
  if (!songId) {
    // No ID, just pass through
    return fetch(request)
  }

  const cacheKey = `${url.origin}${url.pathname}?id=${songId}`

  // Try to get from cache first
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    console.log('[SW] Audio cache HIT:', songId)
    return cachedResponse
  }

  console.log('[SW] Audio cache MISS, fetching:', songId)

  // Fetch without Range header to get full file (200 response)
  const fullRequest = new Request(url, {
    headers: new Headers({
      // Copy original headers except Range
      ...Object.fromEntries(
        Array.from(request.headers.entries()).filter(
          ([key]) => key.toLowerCase() !== 'range',
        ),
      ),
    }),
    credentials: request.credentials,
    mode: request.mode,
  })

  try {
    const response = await fetch(fullRequest)

    // Only cache successful full responses
    if (response.ok && response.status === 200) {
      // Clone response for caching (must clone before reading body)
      const responseToCache = response.clone()
      // Cache asynchronously without blocking return
      cache
        .put(cacheKey, responseToCache)
        .then(() => {
          console.log('[SW] Cached audio:', songId)
        })
        .catch((err) => {
          console.error('[SW] Failed to cache audio:', songId, err)
        })
    }

    return response
  } catch (error) {
    console.error('[SW] Audio fetch failed:', error)
    throw error
  }
}

// Register audio streaming route
workbox.routing.registerRoute(({ url }) => {
  return (
    url.pathname.includes('/stream') ||
    url.pathname.includes('/rest/stream') ||
    url.pathname.match(/\/api\/song\/.*\/stream/)
  )
}, audioHandler)

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
    !url.pathname.startsWith('/api/wrapped/')
  )
}, apiHandler)

// Register navigation handler LAST - after all other routes
// This ensures that API and asset routes are handled first
workbox.routing.registerRoute(
  new workbox.routing.NavigationRoute(navigationHandler),
)
