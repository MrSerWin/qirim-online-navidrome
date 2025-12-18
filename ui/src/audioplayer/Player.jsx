import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useMediaQuery } from '@material-ui/core'
import { ThemeProvider } from '@material-ui/core/styles'
import {
  createMuiTheme,
  useAuthState,
  useDataProvider,
  useTranslate,
} from 'react-admin'
import ReactGA from 'react-ga'
import { GlobalHotKeys } from 'react-hotkeys'
import ReactJkMusicPlayer from 'navidrome-music-player'
import 'navidrome-music-player/assets/index.css'
import useCurrentTheme from '../themes/useCurrentTheme'
import config from '../config'
import { PAUSE_AUDIO_EVENT, PAUSE_VIDEO_EVENT } from '../videoclip/VideoClipShow'
import useStyle from './styles'
import AudioTitle from './AudioTitle'
import {
  clearQueue,
  currentPlaying,
  setPlayMode,
  setVolume,
  syncQueue,
} from '../actions'
import PlayerToolbar from './PlayerToolbar'
import MobilePlayerBar from './MobilePlayerBar'
import { sendNotification } from '../utils'
import subsonic from '../subsonic'
import locale from './locale'
import { keyMap } from '../hotkeys'
import keyHandlers from './keyHandlers'
import { calculateGain } from '../utils/calculateReplayGain'
import useBackgroundPlayback from './useBackgroundPlayback'

const Player = () => {
  const theme = useCurrentTheme()
  const translate = useTranslate()
  const playerTheme = theme.player?.theme || 'dark'
  const dataProvider = useDataProvider()
  const playerState = useSelector((state) => state.player)
  const dispatch = useDispatch()
  const [startTime, setStartTime] = useState(null)
  const [scrobbled, setScrobbled] = useState(false)
  const [preloaded, setPreload] = useState(false)
  const [audioInstance, setAudioInstance] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)
  const isDesktop = useMediaQuery('(min-width:810px)')
  const isMobilePlayer =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  const mobilePlayerMode = useSelector((state) => state.settings.mobilePlayerMode || 'mini')
  const useMiniPlayer = mobilePlayerMode === 'mini'

  const { authenticated } = useAuthState()
  // Check if user is truly authenticated (has valid credentials, not just UNKNOWN user)
  const username = localStorage.getItem('username')
  const isReallyAuthenticated = authenticated && username && username !== 'UNKNOWN'
  const visible = authenticated && playerState.queue.length > 0
  const isRadio = playerState.current?.isRadio || false
  const classes = useStyle({
    isRadio,
    visible,
    enableCoverAnimation: config.enableCoverAnimation,
  })
  const showNotifications = useSelector(
    (state) => state.settings.notifications || false,
  )
  const gainInfo = useSelector((state) => state.replayGain)
  const [context, setContext] = useState(null)
  const [gainNode, setGainNode] = useState(null)

  // Handle background playback recovery
  const handleRecoveryNeeded = useCallback((reason) => {
    console.log('[Player] Recovery needed:', reason)
    // If auth expired, the authProvider will handle redirect to login
    // For playback issues, we just log for now - the hooks will try to recover
  }, [])

  // Use background playback hook for keeping session alive and handling visibility changes
  useBackgroundPlayback({
    audioInstance,
    isPlaying,
    currentTrack: playerState.current,
    onRecoveryNeeded: handleRecoveryNeeded,
  })

  useEffect(() => {
    if (
      context === null &&
      audioInstance &&
      config.enableReplayGain &&
      'AudioContext' in window &&
      (gainInfo.gainMode === 'album' || gainInfo.gainMode === 'track')
    ) {
      const ctx = new AudioContext()
      // we need this to support radios in firefox
      audioInstance.crossOrigin = 'anonymous'
      const source = ctx.createMediaElementSource(audioInstance)
      const gain = ctx.createGain()

      source.connect(gain)
      gain.connect(ctx.destination)

      setContext(ctx)
      setGainNode(gain)
    }
  }, [audioInstance, context, gainInfo.gainMode])

  useEffect(() => {
    if (gainNode) {
      const current = playerState.current || {}
      const song = current.song || {}

      const numericGain = calculateGain(gainInfo, song)
      gainNode.gain.setValueAtTime(numericGain, context.currentTime)
    }
  }, [audioInstance, context, gainNode, playerState, gainInfo])

  const defaultOptions = useMemo(
    () => ({
      theme: playerTheme,
      bounds: 'body',
      playMode: playerState.mode,
      mode: 'full', // Always use full mode, we control visibility with CSS
      loadAudioErrorPlayNext: false,
      autoPlayInitLoadPlayList: true,
      clearPriorAudioLists: false,
      showDestroy: true,
      showDownload: false,
      showLyric: false,
      showReload: false,
      toggleMode: !isDesktop && !useMiniPlayer,
      glassBg: false,
      showThemeSwitch: false,
      showMediaSession: true,
      restartCurrentOnPrev: true,
      quietUpdate: true,
      defaultPosition: {
        top: isDesktop ? 300 : 70,
        left: isDesktop ? 120 : undefined,
        right: isDesktop ? undefined : 20,
      },
      volumeFade: { fadeIn: 200, fadeOut: 200 },
      renderAudioTitle: (audioInfo, isMobile) => (
        <AudioTitle
          audioInfo={audioInfo}
          gainInfo={gainInfo}
          isMobile={isMobile}
        />
      ),
      locale: locale(translate),
    }),
    [gainInfo, isDesktop, useMiniPlayer, playerTheme, translate, playerState.mode],
  )

  const options = useMemo(() => {
    const current = playerState.current || {}
    return {
      ...defaultOptions,
      audioLists: playerState.queue.map((item) => item),
      playIndex: playerState.playIndex,
      autoPlay: playerState.clear || playerState.playIndex === 0,
      clearPriorAudioLists: playerState.clear,
      extendsContent: (
        <PlayerToolbar id={current.trackId} isRadio={current.isRadio} />
      ),
      defaultVolume: isMobilePlayer ? 1 : playerState.volume,
      showMediaSession: !current.isRadio,
    }
  }, [playerState, defaultOptions, isMobilePlayer, useMiniPlayer, isPlayerExpanded])

  const onAudioListsChange = useCallback(
    (_, audioLists, audioInfo) => dispatch(syncQueue(audioInfo, audioLists)),
    [dispatch],
  )

  const nextSong = useCallback(() => {
    const idx = playerState.queue.findIndex(
      (item) => item.uuid === playerState.current.uuid,
    )
    return idx !== null ? playerState.queue[idx + 1] : null
  }, [playerState])

  const onAudioProgress = useCallback(
    (info) => {
      if (info.ended) {
        document.title = 'Qırım Online'
      }

      const progress = (info.currentTime / info.duration) * 100

      if (isNaN(info.duration) || (progress < 50 && info.currentTime < 240)) {
        return
      }

      if (info.isRadio) {
        return
      }

      if (!preloaded) {
        const next = nextSong()
        if (next != null) {
          const audio = new Audio()
          audio.src = next.musicSrc
        }
        setPreload(true)
        return
      }

      if (!scrobbled) {
        if (info.trackId) {
          console.log('[SCROBBLE ON PROGRESS] Conditions met - progress:', progress.toFixed(1), '%, currentTime:', info.currentTime.toFixed(1), 's')
          console.log('[SCROBBLE DEBUG] authenticated:', authenticated, 'username:', username, 'isReallyAuthenticated:', isReallyAuthenticated)
          if (isReallyAuthenticated) {
            // Authenticated user: use regular scrobble (updates both user + global stats)
            console.log('[SCROBBLE] Using regular scrobble (user + global)')
            subsonic.scrobble(info.trackId, startTime).catch((err) => {
              console.error('Scrobble failed:', err)
            })
          } else {
            // Unauthenticated/guest: use globalScrobble (only updates global stats)
            console.log('[SCROBBLE] Using globalScrobble (global only)')
            subsonic.globalScrobble(info.trackId, startTime).catch((err) => {
              console.error('Global scrobble failed:', err)
            })
          }
        }
        setScrobbled(true)
      }
    },
    [startTime, scrobbled, nextSong, preloaded, isReallyAuthenticated, authenticated, username],
  )

  const onAudioVolumeChange = useCallback(
    // sqrt to compensate for the logarithmic volume
    (volume) => dispatch(setVolume(Math.sqrt(volume))),
    [dispatch],
  )

  const onAudioPlay = useCallback(
    (info) => {
      // Do this to start the context; on chrome-based browsers, the context
      // will start paused since it is created prior to user interaction
      if (context && context.state !== 'running') {
        context.resume()
      }

      // Pause video player when audio starts
      window.dispatchEvent(new CustomEvent(PAUSE_VIDEO_EVENT))

      setIsPlaying(true)
      dispatch(currentPlaying(info))
      if (startTime === null) {
        setStartTime(Date.now())
      }
      if (info.duration) {
        const song = info.song
        document.title = `${song.title} - ${song.artist} - Qırım Online`
        if (!info.isRadio) {
          const pos = startTime === null ? null : Math.floor(info.currentTime)
          subsonic.nowPlaying(info.trackId, pos)
        }
        setPreload(false)
        if (config.gaTrackingId) {
          ReactGA.event({
            category: 'Player',
            action: 'Play song',
            label: `${song.title} - ${song.artist}`,
          })
        }
        if (showNotifications) {
          sendNotification(
            song.title,
            `${song.artist} - ${song.album}`,
            info.cover,
          )
        }
      }
    },
    [context, dispatch, showNotifications, startTime],
  )

  const onAudioPlayTrackChange = useCallback((currentPlayId, audioLists, audioInfo) => {
    // Before switching tracks, scrobble if not already scrobbled
    // and the track was played for sufficient time (30% or 30 seconds minimum)
    if (!scrobbled && startTime && audioInfo) {
      const playDuration = (Date.now() - startTime) / 1000 // seconds
      const progress = audioInfo.duration ? (playDuration / audioInfo.duration) * 100 : 0

      // Scrobble if played for at least 30% OR 30 seconds (whichever is shorter)
      // This is more lenient than the original 50%/4min requirement
      const shouldScrobble = progress >= 30 || playDuration >= 30

      console.log('[SCROBBLE ON TRACK CHANGE]', {
        trackId: audioInfo.trackId,
        playDuration: playDuration.toFixed(1),
        progress: progress.toFixed(1),
        shouldScrobble,
        isReallyAuthenticated
      })

      if (shouldScrobble && audioInfo.trackId && !audioInfo.isRadio) {
        if (isReallyAuthenticated) {
          console.log('[SCROBBLE] Track change - using regular scrobble (user + global)')
          subsonic.scrobble(audioInfo.trackId, new Date(startTime)).catch((err) => {
            console.error('Scrobble on track change failed:', err)
          })
        } else {
          console.log('[SCROBBLE] Track change - using globalScrobble (global only)')
          subsonic.globalScrobble(audioInfo.trackId, new Date(startTime)).catch((err) => {
            console.error('Global scrobble on track change failed:', err)
          })
        }
      }
    }

    if (scrobbled) {
      setScrobbled(false)
    }
    if (startTime !== null) {
      setStartTime(null)
    }
  }, [scrobbled, startTime, isReallyAuthenticated])

  const onAudioPause = useCallback(
    (info) => {
      setIsPlaying(false)
      dispatch(currentPlaying(info))
    },
    [dispatch],
  )

  const onAudioEnded = useCallback(
    (currentPlayId, audioLists, info) => {
      setScrobbled(false)
      setStartTime(null)
      dispatch(currentPlaying(info))
      dataProvider
        .getOne('keepalive', { id: info.trackId })
        // eslint-disable-next-line no-console
        .catch((e) => console.log('Keepalive error:', e))
    },
    [dispatch, dataProvider],
  )

  const onCoverClick = useCallback((mode, audioLists, audioInfo) => {
    if (mode === 'full' && audioInfo?.song?.albumId) {
      window.location.href = `#/album/${audioInfo.song.albumId}/show`
    }
  }, [])

  const onBeforeDestroy = useCallback(() => {
    return new Promise((resolve, reject) => {
      dispatch(clearQueue())
      reject()
    })
  }, [dispatch])

  if (!visible) {
    document.title = 'Qırım Online'
  }

  const handlers = useMemo(
    () => keyHandlers(audioInstance, playerState),
    [audioInstance, playerState],
  )

  useEffect(() => {
    if (isMobilePlayer && audioInstance) {
      audioInstance.volume = 1
    }
  }, [isMobilePlayer, audioInstance])

  // Listen for video play event to pause audio
  useEffect(() => {
    const handlePauseAudio = () => {
      if (audioInstance && isPlaying) {
        audioInstance.pause()
      }
    }

    window.addEventListener(PAUSE_AUDIO_EVENT, handlePauseAudio)
    return () => {
      window.removeEventListener(PAUSE_AUDIO_EVENT, handlePauseAudio)
    }
  }, [audioInstance, isPlaying])

  // Add close button to mobile player modal (react-jinke-music-player-mobile)
  useEffect(() => {
    const addCloseButton = () => {
      const mobilePlayer = document.querySelector('.react-jinke-music-player-mobile')
      if (mobilePlayer && !mobilePlayer.querySelector('.music-player-mobile-close')) {
        const closeBtn = document.createElement('button')
        closeBtn.className = 'music-player-mobile-close'
        closeBtn.innerHTML = '×'
        closeBtn.onclick = () => {
          // Find and click the existing toggle/minimize button
          const toggleBtn = document.querySelector('.react-jinke-music-player-mobile-toggle, .react-jinke-music-player-mobile-operation .items')
          if (toggleBtn) {
            toggleBtn.click()
          }
        }
        mobilePlayer.appendChild(closeBtn)
      }
    }

    // Use MutationObserver to detect when mobile player appears
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        addCloseButton()
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })
    addCloseButton() // Initial check

    return () => observer.disconnect()
  }, [])

  // Mobile player control handlers
  const handleMobilePlayPause = useCallback(() => {
    if (audioInstance) {
      if (isPlaying) {
        audioInstance.pause()
      } else {
        audioInstance.play()
      }
    }
  }, [audioInstance, isPlaying])

  const handleMobileNext = useCallback(() => {
    if (audioInstance) {
      const event = new Event('ended')
      audioInstance.dispatchEvent(event)
    }
  }, [audioInstance])

  const handleMobilePrevious = useCallback(() => {
    if (audioInstance) {
      if (audioInstance.currentTime > 3) {
        audioInstance.currentTime = 0
      } else {
        // Navigate to previous track
        const currentIndex = playerState.playIndex
        if (currentIndex > 0) {
          audioInstance.src = playerState.queue[currentIndex - 1].musicSrc
          audioInstance.load()
          audioInstance.play()
        }
      }
    }
  }, [audioInstance, playerState])

  return (
    <ThemeProvider theme={createMuiTheme(theme)}>
      {/* Full player - always rendered for audio playback, but hidden when using mini player and not expanded */}
      <ReactJkMusicPlayer
        {...options}
        className={classes.player}
        onAudioListsChange={onAudioListsChange}
        onAudioVolumeChange={onAudioVolumeChange}
        onAudioProgress={onAudioProgress}
        onAudioPlay={onAudioPlay}
        onAudioPlayTrackChange={onAudioPlayTrackChange}
        onAudioPause={onAudioPause}
        onPlayModeChange={(mode) => dispatch(setPlayMode(mode))}
        onAudioEnded={onAudioEnded}
        onCoverClick={onCoverClick}
        onBeforeDestroy={onBeforeDestroy}
        getAudioInstance={setAudioInstance}
        style={isMobilePlayer && useMiniPlayer && !isPlayerExpanded ? { display: 'none' } : undefined}
      />
      {/* Mini player bar at bottom - shown only on mobile devices when mini player mode is active and player not expanded */}
      {isMobilePlayer && useMiniPlayer && !isPlayerExpanded && (
        <MobilePlayerBar
          audioInstance={audioInstance}
          currentTrack={playerState.current}
          isPlaying={isPlaying}
          onPlayPause={handleMobilePlayPause}
          onNext={handleMobileNext}
          onExpand={() => setIsPlayerExpanded(true)}
        />
      )}
      {/* Close button for expanded player - rendered at top level for proper positioning */}
      {isMobilePlayer && useMiniPlayer && isPlayerExpanded && (
        <button
          onClick={() => setIsPlayerExpanded(false)}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            zIndex: 10000,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
          title="Свернуть плеер"
        >
          ×
        </button>
      )}
      <GlobalHotKeys handlers={handlers} keyMap={keyMap} allowChanges />
    </ThemeProvider>
  )
}

export { Player }
