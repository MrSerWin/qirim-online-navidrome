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
      // For unauthenticated users (no token), just ignore the error
      // They should be able to browse as guests
      const isAuthenticated = localStorage.getItem('is-authenticated')

      if (!isAuthenticated) {
        // Not authenticated - ignore 401/403 and allow guest access
        return Promise.resolve()
      }

      // For authenticated users, logout on 401/403
      // This means their session is invalid
      removeItems()
      return Promise.reject()
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

const removeItems = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('name')
  localStorage.removeItem('username')
  localStorage.removeItem('avatar')
  localStorage.removeItem('role')
  localStorage.removeItem('subsonic-salt')
  localStorage.removeItem('subsonic-token')
  localStorage.removeItem('is-authenticated')
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
