import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { makeStyles } from '@material-ui/core/styles'
import { IconButton, Typography, Box } from '@material-ui/core'
import { PlayArrow, Pause, SkipNext } from '@material-ui/icons'
import subsonic from '../subsonic'
import defaultCover from '../icons/qo-512x512.png'

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.palette.background.paper,
    borderTop: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(1, 2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    zIndex: 1300,
    boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    cursor: 'pointer',
  },
  coverArt: {
    width: 48,
    height: 48,
    borderRadius: theme.spacing(0.5),
    objectFit: 'cover',
    flexShrink: 0,
    backgroundColor: theme.palette.action.hover,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  trackTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.palette.text.primary,
    lineHeight: 1.3,
  },
  trackArtist: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
  },
  playButton: {
    padding: theme.spacing(0.75),
    backgroundColor: '#676767',
    color: '#fff',
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
    '& svg': { fontSize: '1.75rem' },
  },
  controlButton: {
    padding: theme.spacing(0.75),
    '& svg': { fontSize: '1.5rem' },
  },
}))

// Self-contained mobile player bar.
// Listens to audio element events directly — NO state changes in Player.jsx callbacks.
const MobilePlayerBar = ({ audioInstance }) => {
  const classes = useStyles()
  const playerState = useSelector((state) => state.player)
  const currentTrack = playerState.current
  const [playing, setPlaying] = useState(false)

  // Listen to audio element play/pause events directly
  useEffect(() => {
    if (!audioInstance) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    // Sync initial state
    setPlaying(!audioInstance.paused)
    audioInstance.addEventListener('play', onPlay)
    audioInstance.addEventListener('pause', onPause)
    return () => {
      audioInstance.removeEventListener('play', onPlay)
      audioInstance.removeEventListener('pause', onPause)
    }
  }, [audioInstance])

  const handlePlayPause = useCallback(
    (e) => {
      e.stopPropagation()
      if (!audioInstance) return
      if (audioInstance.paused) {
        audioInstance.play()
      } else {
        audioInstance.pause()
      }
    },
    [audioInstance],
  )

  const handleNext = useCallback(
    (e) => {
      e.stopPropagation()
      if (!audioInstance) return
      audioInstance.dispatchEvent(new Event('ended'))
    },
    [audioInstance],
  )

  const handleExpand = useCallback(() => {
    // Find the library's class component instance via React fiber
    // and set toggle:true directly — same as what onOpenPanel does
    const playerEl = document.querySelector('.react-jinke-music-player-main')
    if (!playerEl) return
    const fiberKey = Object.keys(playerEl).find((k) =>
      k.startsWith('__reactInternalInstance$') || k.startsWith('__reactFiber$'),
    )
    if (!fiberKey) return
    let fiber = playerEl[fiberKey]
    while (fiber) {
      const instance = fiber.stateNode
      if (instance && instance.state && 'toggle' in instance.state) {
        instance.setState({ toggle: true })
        return
      }
      fiber = fiber.return
    }
  }, [])

  if (!playerState.queue.length || !currentTrack?.name) return null

  const coverUrl = currentTrack.coverArtId
    ? subsonic.getCoverArtUrl(currentTrack.coverArtId, 96)
    : defaultCover

  return (
    <Box className={classes.root} onClick={handleExpand}>
      <img src={coverUrl} alt="" className={classes.coverArt} />
      <Box className={classes.trackInfo}>
        <Typography className={classes.trackTitle}>{currentTrack.name}</Typography>
        {currentTrack.singer && (
          <Typography className={classes.trackArtist}>{currentTrack.singer}</Typography>
        )}
      </Box>
      <Box className={classes.controls}>
        <IconButton className={classes.playButton} onClick={handlePlayPause}>
          {playing ? <Pause /> : <PlayArrow />}
        </IconButton>
        <IconButton className={classes.controlButton} onClick={handleNext}>
          <SkipNext />
        </IconButton>
      </Box>
    </Box>
  )
}

export default MobilePlayerBar
