/**
 * URL Generator utility for creating beautiful URLs with aliases
 * Supports both ID-based and alias-based URLs for backward compatibility
 */

/**
 * Generates a URL for an album
 * @param {string} albumId - The album ID
 * @param {string} albumAlias - The album alias (optional)
 * @param {string} action - The action (default: 'show')
 * @param {boolean} useAlias - Whether to use alias instead of ID
 * @returns {string} The generated URL
 */
export const generateAlbumURL = (albumId, albumAlias, action = 'show', useAlias = true) => {
  if (!albumId) return '#'
  
  // Use alias if available and useAlias is true, otherwise fall back to ID
  const identifier = useAlias && albumAlias && albumAlias.trim() ? albumAlias : albumId
  return `/album/${identifier}/${action}`
}

/**
 * Generates a URL for an artist
 * @param {string} artistId - The artist ID
 * @param {string} artistAlias - The artist alias (optional)
 * @param {string} action - The action (default: 'show')
 * @param {boolean} useAlias - Whether to use alias instead of ID
 * @returns {string} The generated URL
 */
export const generateArtistURL = (artistId, artistAlias, action = 'show', useAlias = true) => {
  if (!artistId || artistId === '') {
    return '#'
  }
  
  // Use alias if available and useAlias is true, otherwise fall back to ID
  // Also check that alias doesn't contain path separators (like '/artist')
  const isValidAlias = artistAlias && artistAlias.trim() && !artistAlias.includes('/')
  const identifier = useAlias && isValidAlias ? artistAlias : artistId
  return `/artist/${identifier}/${action}`
}

/**
 * Generates a URL for a song
 * @param {string} songId - The song ID
 * @param {string} songAlias - The song alias (optional)
 * @param {string} action - The action (default: 'show')
 * @param {boolean} useAlias - Whether to use alias instead of ID
 * @returns {string} The generated URL
 */
export const generateSongURL = (songId, songAlias, action = 'show', useAlias = true) => {
  if (!songId) return '#'
  
  // Use alias if available and useAlias is true, otherwise fall back to ID
  const identifier = useAlias && songAlias && songAlias.trim() ? songAlias : songId
  return `/song/${identifier}/${action}`
}

/**
 * Generates a URL for a playlist
 * @param {string} playlistId - The playlist ID
 * @param {string} action - The action (default: 'show')
 * @returns {string} The generated URL
 */
export const generatePlaylistURL = (playlistId, action = 'show') => {
  if (!playlistId) return '#'
  return `/playlist/${playlistId}/${action}`
}

/**
 * Generates a URL for a radio station
 * @param {string} radioId - The radio ID
 * @param {string} action - The action (default: 'show')
 * @returns {string} The generated URL
 */
export const generateRadioURL = (radioId, action = 'show') => {
  if (!radioId) return '#'
  return `/radio/${radioId}/${action}`
}

/**
 * Checks if a string looks like a UUID
 * @param {string} str - The string to check
 * @returns {boolean} True if it looks like a UUID
 */
export const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false
  
  // UUID pattern: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidPattern.test(str)
}

/**
 * Checks if a string looks like an alias (not a UUID)
 * @param {string} str - The string to check
 * @returns {boolean} True if it looks like an alias
 */
export const isAlias = (str) => {
  return !isUUID(str)
}

/**
 * Determines whether to use alias or ID based on the identifier
 * @param {string} identifier - The identifier (could be ID or alias)
 * @returns {boolean} True if identifier is an alias, false if it's an ID
 */
export const shouldUseAlias = (identifier) => {
  return !isUUID(identifier)
}

/**
 * Gets the display name for a URL (for breadcrumbs, etc.)
 * @param {string} identifier - The identifier (ID or alias)
 * @param {string} name - The display name
 * @param {string} type - The type ('album', 'artist', 'song')
 * @returns {string} The display name
 */
export const getURLDisplayName = (identifier, name, type) => {
  if (isAlias(identifier)) {
    // Convert alias back to readable format
    return identifier
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  return name || `${type} ${identifier}`
}

/**
 * Generates a shareable URL for an album using alias
 * @param {string} albumId - The album ID
 * @param {string} albumAlias - The album alias
 * @param {string} baseURL - The base URL of the site
 * @returns {string} The full shareable URL
 */
export const generateAlbumShareURL = (albumId, albumAlias, baseURL) => {
  const path = generateAlbumURL(albumId, albumAlias, 'show', true) // Use alias for sharing
  return createShareableURL(baseURL, path)
}

/**
 * Generates a shareable URL for an artist using alias
 * @param {string} artistId - The artist ID
 * @param {string} artistAlias - The artist alias
 * @param {string} baseURL - The base URL of the site
 * @returns {string} The full shareable URL
 */
export const generateArtistShareURL = (artistId, artistAlias, baseURL) => {
  const path = generateArtistURL(artistId, artistAlias, 'show', true) // Use alias for sharing
  return createShareableURL(baseURL, path)
}

/**
 * Generates a shareable URL for a song using alias
 * @param {string} songId - The song ID
 * @param {string} songAlias - The song alias
 * @param {string} baseURL - The base URL of the site
 * @returns {string} The full shareable URL
 */
export const generateSongShareURL = (songId, songAlias, baseURL) => {
  const path = generateSongURL(songId, songAlias, 'show', true) // Use alias for sharing
  return createShareableURL(baseURL, path)
}

/**
 * Creates a shareable URL with alias support
 * @param {string} baseURL - The base URL of the site
 * @param {string} path - The path (e.g., '/album/alias/show')
 * @returns {string} The full shareable URL
 */
export const createShareableURL = (baseURL, path) => {
  // Remove trailing slash from baseURL and leading slash from path
  const cleanBaseURL = baseURL.replace(/\/$/, '')
  const cleanPath = path.replace(/^\//, '')
  
  return `${cleanBaseURL}/#/${cleanPath}`
}

/**
 * Parses a URL to extract the identifier and determine if it's an alias
 * @param {string} url - The URL to parse
 * @returns {object} Object with identifier, isAlias, and type
 */
export const parseURL = (url) => {
  const match = url.match(/#\/(album|artist|song|playlist|radio)\/([^\/]+)/)
  if (!match) {
    return { identifier: null, isAlias: false, type: null }
  }
  
  const [, type, identifier] = match
  const isAliasFlag = isAlias(identifier)
  
  return {
    identifier,
    isAlias: isAliasFlag,
    type,
  }
}
