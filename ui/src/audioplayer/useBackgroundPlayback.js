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
  audioContext,
  onRecoveryNeeded,
}) => {
  const dataProvider = useDataProvider()
  const keepaliveIntervalRef = useRef(null)
  const nowPlayingIntervalRef = useRef(null)
  const wasPlayingBeforeHidden = useRef(false)
  const lastKeepaliveTime = useRef(Date.now())
  const lastNowPlayingTime = useRef(Date.now())
  // Track isPlaying via ref to avoid triggering interval cleanup on pause
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

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

  // Start periodic keepalive and nowPlaying when there's a track in queue
  // FIX: Don't depend on isPlaying — browser can pause audio briefly in background
  // and we must NOT clear intervals during those brief pauses
  useEffect(() => {
    if (currentTrack) {
      if (keepaliveIntervalRef.current) {
        clearInterval(keepaliveIntervalRef.current)
      }
      if (nowPlayingIntervalRef.current) {
        clearInterval(nowPlayingIntervalRef.current)
      }

      // Keepalive: send when playing OR when tab is hidden (session might still be needed)
      keepaliveIntervalRef.current = setInterval(() => {
        if (isPlayingRef.current || document.visibilityState === 'hidden') {
          sendKeepalive()
        }
      }, KEEPALIVE_INTERVAL)

      // NowPlaying: only when actually playing
      nowPlayingIntervalRef.current = setInterval(() => {
        if (isPlayingRef.current && !currentTrack?.isRadio) {
          sendNowPlaying()
        }
      }, NOWPLAYING_INTERVAL)

      if (isPlayingRef.current) {
        sendKeepalive()
        sendNowPlaying()
      }
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
  }, [currentTrack, sendKeepalive, sendNowPlaying])

  // Handle Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasPlayingBeforeHidden.current = isPlayingRef.current

        if (isPlayingRef.current) {
          sendKeepalive()
          sendNowPlaying()
        }

        console.log('[BackgroundPlayback] Tab hidden, wasPlaying:', isPlayingRef.current)
      } else if (document.visibilityState === 'visible') {
        console.log('[BackgroundPlayback] Tab visible, wasPlaying:', wasPlayingBeforeHidden.current)

        sendKeepalive()

        // Resume AudioContext if browser suspended it in background
        if (audioContext && audioContext.state !== 'running') {
          console.log('[BackgroundPlayback] Resuming AudioContext, state:', audioContext.state)
          audioContext.resume().catch((e) => {
            console.warn('[BackgroundPlayback] AudioContext resume failed:', e)
          })
        }

        if (audioInstance && wasPlayingBeforeHidden.current) {
          if (audioInstance.paused) {
            console.log('[BackgroundPlayback] Audio paused unexpectedly, attempting recovery')
            audioInstance.play().catch((e) => {
              console.warn('[BackgroundPlayback] Failed to resume playback:', e)
              onRecoveryNeeded?.('playback_stopped')
            })
          } else {
            sendNowPlaying()
          }
        }

        const timeSinceLastKeepalive = Date.now() - lastKeepaliveTime.current
        if (timeSinceLastKeepalive > KEEPALIVE_INTERVAL * 3) {
          console.log('[BackgroundPlayback] Long time since last keepalive, checking session')
          sendKeepalive()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [audioInstance, audioContext, sendKeepalive, sendNowPlaying, onRecoveryNeeded])

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

      if (audioInstance.error) {
        const error = audioInstance.error
        console.error('[BackgroundPlayback] Audio error code:', error.code, 'message:', error.message)

        if (error.code === 2 || error.code === 4) {
          onRecoveryNeeded?.('audio_error')
        }
      }
    }

    const handleStalled = () => {
      console.warn('[BackgroundPlayback] Audio stalled')
      sendKeepalive()
    }

    const handleWaiting = () => {
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

  // Monitor AudioContext state — auto-resume if browser suspends it during playback
  useEffect(() => {
    if (!audioContext) return

    const handleStateChange = () => {
      console.log('[BackgroundPlayback] AudioContext state:', audioContext.state)
      if (audioContext.state === 'suspended' && isPlayingRef.current) {
        console.log('[BackgroundPlayback] AudioContext suspended during playback, resuming')
        audioContext.resume().catch((e) => {
          console.warn('[BackgroundPlayback] AudioContext auto-resume failed:', e)
        })
      }
    }

    audioContext.addEventListener('statechange', handleStateChange)
    return () => audioContext.removeEventListener('statechange', handleStateChange)
  }, [audioContext])

  return {
    sendKeepalive,
    sendNowPlaying,
  }
}

export default useBackgroundPlayback
