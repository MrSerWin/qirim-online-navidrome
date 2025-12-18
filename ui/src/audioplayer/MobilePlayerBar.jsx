import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { makeStyles } from '@material-ui/core/styles'
import {
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Box,
} from '@material-ui/core'
import {
  PlayArrow,
  Pause,
  SkipNext,
  QueueMusic,
  Close,
} from '@material-ui/icons'
import { setMobilePlayerMode } from '../actions'
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
    backdropFilter: 'blur(20px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
  hidden: {
    transform: 'translateY(100%)',
    opacity: 0,
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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
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
    fontWeight: 400,
    lineHeight: 1.3,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
  },
  controlButton: {
    padding: theme.spacing(0.75),
    transition: 'all 0.2s ease',
    '& svg': {
      fontSize: '1.5rem',
      transition: 'transform 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
      '& svg': {
        transform: 'scale(1.1)',
      },
    },
  },
  playButton: {
    padding: theme.spacing(0.75),
    backgroundColor: '#676767', // theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    transition: 'all 0.2s ease',
    '& svg': {
      fontSize: '1.75rem',
      transition: 'transform 0.2s ease',
    },
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
      '& svg': {
        transform: 'scale(1.1)',
      },
    },
    '&:active': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  drawer: {
    '& .MuiDrawer-paper': {
      maxHeight: '70vh',
      borderTopLeftRadius: theme.spacing(2),
      borderTopRightRadius: theme.spacing(2),
    },
  },
  drawerHeader: {
    padding: theme.spacing(2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  drawerTitle: {
    fontWeight: 600,
  },
  queueItem: {
    '&.current': {
      backgroundColor: theme.palette.action.selected,
    },
  },
}))

const MobilePlayerBar = ({ audioInstance, currentTrack, isPlaying, onPlayPause, onNext, onExpand }) => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const [queueOpen, setQueueOpen] = useState(false)
  const playerState = useSelector((state) => state.player)
  const visible = playerState.queue.length > 0

  const handleExpandPlayer = () => {
    if (onExpand) {
      onExpand()
    }
  }

  const handleToggleQueue = () => {
    setQueueOpen(!queueOpen)
  }

  const handleCloseQueue = () => {
    setQueueOpen(false)
  }

  // Hide player if no queue, no track, or track has no name (e.g., invalid/empty track)
  if (!visible || !currentTrack || !currentTrack.name) {
    return null
  }

  const coverArtUrl = currentTrack.coverArtId
    ? subsonic.getCoverArtUrl(currentTrack.coverArtId, 96)
    : defaultCover

  return (
    <>
      <Box
        className={`${classes.root} ${!visible ? classes.hidden : ''}`}
        onClick={handleExpandPlayer}
      >
        {/* Album Cover */}
        <img
          src={coverArtUrl}
          alt={currentTrack.album || 'Album cover'}
          className={classes.coverArt}
        />

        {/* Track Info - hide when no track name (e.g., video clips) */}
        {currentTrack.name && (
          <Box className={classes.trackInfo}>
            <Typography className={classes.trackTitle}>
              {currentTrack.name}
            </Typography>
            {currentTrack.singer && (
              <Typography className={classes.trackArtist}>
                {currentTrack.singer}
              </Typography>
            )}
          </Box>
        )}

        {/* Playback Controls */}
        <Box className={classes.controls}>
          <IconButton
            className={classes.playButton}
            onClick={(e) => {
              e.stopPropagation()
              onPlayPause()
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause /> : <PlayArrow />}
          </IconButton>

          <IconButton
            className={classes.controlButton}
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Next track"
          >
            <SkipNext />
          </IconButton>
        </Box>
      </Box>

      {/* Queue Drawer */}
      <Drawer
        anchor="bottom"
        open={queueOpen}
        onClose={handleCloseQueue}
        className={classes.drawer}
      >
        <Box className={classes.drawerHeader}>
          <Typography variant="h6" className={classes.drawerTitle}>
            Current Queue ({playerState.queue.length})
          </Typography>
          <IconButton onClick={handleCloseQueue} size="small">
            <Close />
          </IconButton>
        </Box>
        <List>
          {playerState.queue.map((track, index) => (
            <ListItem
              key={track.trackId || index}
              className={index === playerState.playIndex ? classes.queueItem + ' current' : classes.queueItem}
              button
            >
              <ListItemText
                primary={track.name}
                secondary={track.singer}
                primaryTypographyProps={{
                  style: { fontWeight: index === playerState.playIndex ? 600 : 400 }
                }}
              />
              <ListItemSecondaryAction>
                <Typography variant="caption" color="textSecondary">
                  {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  )
}

export default MobilePlayerBar
