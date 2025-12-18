import { useEffect, useRef, useCallback } from 'react'
import { useDataProvider } from 'react-admin'
import subsonic from '../subsonic'

const KEEPALIVE_INTERVAL = 30000 // 30 seconds
const NOWPLAYING_INTERVAL = 60000 // 60 seconds

/**
 * Hook to handle background playback issues:
 * 1. Page Visibility API - detect when tab becomes inactive/active
 * 2. Periodic keepalive to prevent session timeout
 * 3. Periodic nowPlaying updates
 * 4. Recovery when tab becomes visible again
 */
const useBackgroundPlayback = ({
  audioInstance,
  isPlaying,
  currentTrack,
  onRecoveryNeeded,
}) => {
  const dataProvider = useDataProvider()
  const keepaliveIntervalRef = useRef(null)
  const nowPlayingIntervalRef = useRef(null)
  const wasPlayingBeforeHidden = useRef(false)
  const lastKeepaliveTime = useRef(Date.now())
  const lastNowPlayingTime = useRef(Date.now())

  // Send keepalive to server
  const sendKeepalive = useCallback(() => {
    if (!currentTrack?.trackId) return

    const now = Date.now()
    // Prevent too frequent calls (minimum 10 seconds between calls)
    if (now - lastKeepaliveTime.current < 10000) return

    lastKeepaliveTime.current = now

    dataProvider
      .getOne('keepalive', { id: currentTrack.trackId })
      .catch((e) => {
        console.warn('[BackgroundPlayback] Keepalive error:', e)
        // If keepalive fails, might need recovery
        if (e.status === 401 || e.status === 403) {
          onRecoveryNeeded?.('auth_expired')
        }
      })
  }, [dataProvider, currentTrack, onRecoveryNeeded])

  // Send nowPlaying update
  const sendNowPlaying = useCallback(() => {
    if (!currentTrack?.trackId || currentTrack?.isRadio) return
    if (!audioInstance) return

    const now = Date.now()
    // Prevent too frequent calls (minimum 30 seconds between calls)
    if (now - lastNowPlayingTime.current < 30000) return

    lastNowPlayingTime.current = now

    const position = Math.floor(audioInstance.currentTime || 0)
    subsonic.nowPlaying(currentTrack.trackId, position).catch((e) => {
      console.warn('[BackgroundPlayback] NowPlaying error:', e)
    })
  }, [audioInstance, currentTrack])

  // Start periodic keepalive and nowPlaying when playing
  useEffect(() => {
    if (isPlaying && currentTrack) {
      // Clear any existing intervals
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current)
      }
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current)
      }

      // Start keepalive interval
      keepaliveIntervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' || isPlaying) {
          sendKeepalive()
        }
      }, KEEPALIVE_INTERVAL)

      // Start nowPlaying interval
      nowPlayingIntervalRef.current = setInterval(() => {
        if (isPlaying && !currentTrack?.isRadio) {
          sendNowPlaying()
        }
      }, NOWPLAYING_INTERVAL)

      // Send initial keepalive and nowPlaying
      sendKeepalive()
      sendNowPlaying()
    }

    return () => {
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current)
        keepaliveIntervalRef.current = null
      }
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current)
        nowPlayingIntervalRef.current = null
      }
    }
  }, [isPlaying, currentTrack, sendKeepalive, sendNowPlaying])

  // Handle Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab became hidden
        wasPlayingBeforeHidden.current = isPlaying

        // Send keepalive before hiding (browser might throttle after this)
        if (isPlaying) {
          sendKeepalive()
          sendNowPlaying()
        }

        console.log('[BackgroundPlayback] Tab hidden, wasPlaying:', isPlaying)
      } else if (document.visibilityState === 'visible') {
        // Tab became visible
        console.log('[BackgroundPlayback] Tab visible, wasPlaying:', wasPlayingBeforeHidden.current)

        // Always send keepalive when becoming visible
        sendKeepalive()

        // Check if audio is still playing as expected
        if (audioInstance && wasPlayingBeforeHidden.current) {
          // If it was playing but now paused, might need recovery
          if (audioInstance.paused) {
            console.log('[BackgroundPlayback] Audio was paused unexpectedly, attempting recovery')

            // Try to resume playback
            audioInstance.play().catch((e) => {
              console.warn('[BackgroundPlayback] Failed to resume playback:', e)
              onRecoveryNeeded?.('playback_stopped')
            })
          } else {
            // Still playing, just send nowPlaying update
            sendNowPlaying()
          }
        }

        // Check for potential issues after being hidden for a long time
        const timeSinceLastKeepalive = Date.now() - lastKeepaliveTime.current
        if (timeSinceLastKeepalive > KEEPALIVE_INTERVAL * 3) {
          console.log('[BackgroundPlayback] Long time since last keepalive, checking session')
          // Session might have expired, verify by sending keepalive
          sendKeepalive()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [audioInstance, isPlaying, sendKeepalive, sendNowPlaying, onRecoveryNeeded])

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('[BackgroundPlayback] Network online')
      // Send keepalive when network comes back
      sendKeepalive()

      // Check if we need to recover playback
      if (audioInstance && wasPlayingBeforeHidden.current && audioInstance.paused) {
        audioInstance.play().catch((e) => {
          console.warn('[BackgroundPlayback] Failed to resume after network restore:', e)
        })
      }
    }

    const handleOffline = () => {
      console.log('[BackgroundPlayback] Network offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [audioInstance, sendKeepalive])

  // Handle audio errors that might occur in background
  useEffect(() => {
    if (!audioInstance) return

    const handleError = (e) => {
      console.error('[BackgroundPlayback] Audio error:', e)

      // Check if it's a network or auth error
      if (audioInstance.error) {
        const error = audioInstance.error
        console.error('[BackgroundPlayback] Audio error code:', error.code, 'message:', error.message)

        // MEDIA_ERR_NETWORK (2) or MEDIA_ERR_SRC_NOT_SUPPORTED (4) might indicate session issues
        if (error.code === 2 || error.code === 4) {
          onRecoveryNeeded?.('audio_error')
        }
      }
    }

    const handleStalled = () => {
      console.warn('[BackgroundPlayback] Audio stalled')
      // Send keepalive to check session
      sendKeepalive()
    }

    const handleWaiting = () => {
      // Audio is waiting for data, this is normal during buffering
      // but prolonged waiting might indicate issues
      console.log('[BackgroundPlayback] Audio waiting for data')
    }

    audioInstance.addEventListener('error', handleError)
    audioInstance.addEventListener('stalled', handleStalled)
    audioInstance.addEventListener('waiting', handleWaiting)

    return () => {
      audioInstance.removeEventListener('error', handleError)
      audioInstance.removeEventListener('stalled', handleStalled)
      audioInstance.removeEventListener('waiting', handleWaiting)
    }
  }, [audioInstance, sendKeepalive, onRecoveryNeeded])

  return {
    sendKeepalive,
    sendNowPlaying,
  }
}

export default useBackgroundPlayback
