export const removeHomeCache = async () => {
  try {
    const workboxKey = (await caches.keys()).find((key) =>
      key.startsWith('workbox-precache'),
    )
    if (!workboxKey) return

    const workboxCache = await caches.open(workboxKey)
    const indexKey = (await workboxCache.keys()).find((key) =>
      key.url.includes('app/index.html'),
    )

    if (indexKey) {
      await workboxCache.delete(indexKey)
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error reading cache', e)
  }
}

// Clear all user-specific caches on logout
export const clearAllUserCaches = async () => {
  try {
    // Get all cache names
    const cacheNames = await caches.keys()

    // Clear API cache (contains playlists, songs, albums metadata)
    const apiCaches = cacheNames.filter((name) =>
      name.includes('api-cache') || name.includes('images-cache')
    )

    for (const cacheName of apiCaches) {
      await caches.delete(cacheName)
      // eslint-disable-next-line no-console
      console.log('[Cache] Cleared cache:', cacheName)
    }

    // Also clear the home cache
    await removeHomeCache()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('error clearing user caches', e)
  }
}
