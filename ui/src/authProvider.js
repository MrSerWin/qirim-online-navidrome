import { jwtDecode } from 'jwt-decode'
import { baseUrl } from './utils'
import config from './config'
import { removeHomeCache, clearAllUserCaches } from './utils/removeHomeCache'

// config sent from server may contain authentication info, for example when the user is authenticated
// by a reverse proxy request header
if (config.auth) {
  try {
    storeAuthenticationInfo(config.auth)
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e)
  }
}

function storeAuthenticationInfo(authInfo) {
  authInfo.token && localStorage.setItem('token', authInfo.token)
  localStorage.setItem('userId', authInfo.id)
  localStorage.setItem('name', authInfo.name)
  localStorage.setItem('username', authInfo.username)
  authInfo.avatar && localStorage.setItem('avatar', authInfo.avatar)
  localStorage.setItem('role', authInfo.isAdmin ? 'admin' : 'regular')
  localStorage.setItem('subsonic-salt', authInfo.subsonicSalt)
  localStorage.setItem('subsonic-token', authInfo.subsonicToken)
  localStorage.setItem('is-authenticated', 'true')
}

const authProvider = {
  login: ({ username, password }) => {
    let url = baseUrl('/auth/login')
    if (config.firstTime) {
      url = baseUrl('/auth/createAdmin')
    }
    const request = new Request(url, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
    return fetch(request)
      .then((response) => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(response.statusText)
        }
        return response.json()
      })
      .then(async (response) => {
        jwtDecode(response.token) // Validate token
        storeAuthenticationInfo(response)
        // Avoid "going to create admin" dialog after logout/login without a refresh
        config.firstTime = false
        removeHomeCache()

        // Wait to ensure localStorage is fully updated before React-Admin makes requests
        // This prevents race condition where httpClient reads empty token
        await new Promise(resolve => setTimeout(resolve, 100))

        // Check if we need to redirect back to device grant page
        const deviceGrantReturnUrl = sessionStorage.getItem('deviceGrantReturnUrl')
        if (deviceGrantReturnUrl) {
          sessionStorage.removeItem('deviceGrantReturnUrl')
          // Use setTimeout to let react-admin finish its login flow first
          setTimeout(() => {
            window.location.hash = deviceGrantReturnUrl
          }, 200)
        }

        return response
      })
      .catch((error) => {
        if (
          error.message === 'Failed to fetch' ||
          error.stack === 'TypeError: Failed to fetch'
        ) {
          throw new Error('errors.network_error')
        }

        throw new Error(error)
      })
  },

  logout: () => {
    removeItems()
    clearAllUserCaches() // Clear all service worker caches (API, images, etc.)
    return Promise.resolve()
  },

  checkAuth: () => {
    // Allow unauthenticated access for public content
    // Return 'guest' role if not authenticated, otherwise resolve normally
    if (localStorage.getItem('is-authenticated')) {
      return Promise.resolve()
    }
    // Don't reject - allow access but with 'guest' permissions
    return Promise.resolve()
  },

  checkError: ({ status }) => {
    if (status === 401 || status === 403) {
      // Never force a redirect to the login page on an auth error.
      // The login page must only appear when the user explicitly clicks
      // "Login"; the default landing page is the public home page.
      //
      // Background pollers (keepalive, now-playing, queue auto-save, SSE)
      // can hit a transient/expired 401/403. If we rejected here,
      // react-admin would log the user out and redirect to /login, which
      // is exactly the unwanted behavior. Instead, silently downgrade an
      // expired session to guest (preserving the player queue and other
      // non-auth state) and keep the user where they are.
      if (localStorage.getItem('is-authenticated')) {
        clearSession()
      }
      return Promise.resolve()
    }
    return Promise.resolve()
  },

  getPermissions: () => {
    const role = localStorage.getItem('role')
    // Return 'guest' for unauthenticated users instead of rejecting
    return Promise.resolve(role || 'guest')
  },

  getIdentity: () => {
    const username = localStorage.getItem('username')
    // Return null for guests (unauthenticated users)
    if (!username) {
      return Promise.resolve(null)
    }
    return Promise.resolve({
      id: username,
      fullName: localStorage.getItem('name'),
      avatar: localStorage.getItem('avatar'),
    })
  },
}

// Remove only the authentication/session items, preserving the player queue
// and other non-auth app state. Used to downgrade an expired session to guest
// without a forced logout/redirect (see checkError).
const clearSession = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('name')
  localStorage.removeItem('username')
  localStorage.removeItem('avatar')
  localStorage.removeItem('role')
  localStorage.removeItem('subsonic-salt')
  localStorage.removeItem('subsonic-token')
  localStorage.removeItem('is-authenticated')
}

// Full cleanup for an explicit logout: clears the session plus all
// user-specific app state (player queue, caches, preferences).
const removeItems = () => {
  clearSession()
  // Clear persisted Redux state (player queue, playlists, library, etc.)
  localStorage.removeItem('state')
  // Clear other app-specific data
  localStorage.removeItem('translation')
  localStorage.removeItem('shopCart')
  // Clear replay gain settings (user-specific audio preferences)
  localStorage.removeItem('replayGainMode')
  localStorage.removeItem('replayGainPreamp')
}

export default authProvider
