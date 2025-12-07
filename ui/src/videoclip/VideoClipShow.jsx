import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  IconButton,
  useMediaQuery,
  CircularProgress,
} from '@material-ui/core'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import ShuffleIcon from '@material-ui/icons/Shuffle'
import RepeatIcon from '@material-ui/icons/Repeat'
import RepeatOneIcon from '@material-ui/icons/RepeatOne'
import { useShowController, useDataProvider, useNotify, useTranslate, Title as PageTitle } from 'react-admin'
import { Title } from '../common'
import { useHistory, useParams } from 'react-router-dom'
import YouTube from 'react-youtube'

// Custom events for audio/video coordination
export const PAUSE_AUDIO_EVENT = 'pauseAudioPlayer'
export const PAUSE_VIDEO_EVENT = 'pauseVideoPlayer'

const useStyles = makeStyles((theme) => ({
  '@global': {
    // Override react-admin main content styles on mobile for video page
    [theme.breakpoints.down('sm')]: {
      'body, html, #root, #root > div, #root > div > div': {
        overflowX: 'hidden !important',
        maxWidth: '100vw !important',
      },
      // Target all possible react-admin layout containers
      '.RaLayout-content, .RaLayout-contentWithSidebar, main, [class*="RaLayout"], [class*="Layout-content"], [class*="MuiBox"], [class*="jss"]': {
        paddingLeft: '0 !important',
        paddingRight: '0 !important',
        marginLeft: '0 !important',
        marginRight: '0 !important',
        maxWidth: '100vw !important',
        width: '100% !important',
        minWidth: '0 !important',
        boxSizing: 'border-box !important',
      },
    },
  },
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      padding: 0,
      paddingBottom: theme.spacing(1),
    },
  },
  videoWrapper: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    [theme.breakpoints.down('sm')]: {
      maxWidth: '100%',
    },
  },
  videoContainer: {
    position: 'relative',
    height: 0,
    overflow: 'hidden',
    paddingBottom: '56.25%', // 16:9 aspect ratio
    backgroundColor: '#000',
    borderRadius: theme.shape.borderRadius,
    [theme.breakpoints.down('sm')]: {
      borderRadius: 0,
    },
  },
  videoPlayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  videoIframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  infoContainer: {
    maxWidth: '1280px',
    width: '100%',
    margin: '0 auto',
    marginTop: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(0, 1),
      marginTop: theme.spacing(1),
    },
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.2rem',
    },
  },
  artist: {
    fontSize: '1.1rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  channelName: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  channelLink: {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  controlButton: {
    color: theme.palette.text.primary,
    '&:hover': {
      color: theme.palette.primary.main,
    },
  },
  activeControl: {
    color: theme.palette.primary.main,
  },
  description: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: theme.shape.borderRadius,
    whiteSpace: 'pre-wrap',
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    maxHeight: '200px',
    overflow: 'auto',
  },
  nextUpContainer: {
    marginTop: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: theme.shape.borderRadius,
  },
  nextUpTitle: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  nextUpItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    cursor: 'pointer',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  nextUpThumbnail: {
    width: '80px',
    height: '45px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  nextUpInfo: {
    flex: 1,
    minWidth: 0,
  },
  nextUpItemTitle: {
    fontSize: '0.85rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nextUpItemArtist: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
}))

const REPEAT_MODES = {
  OFF: 'off',
  ALL: 'all',
  ONE: 'one',
}

const VideoClipShow = (props) => {
  const classes = useStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const history = useHistory()
  const { id } = useParams()
  const dataProvider = useDataProvider()
  const notify = useNotify()
  const translate = useTranslate()
  const playerRef = useRef(null)

  const { record, loading } = useShowController({
    ...props,
    resource: 'video-clip',
    id,
  })

  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [shuffle, setShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState(REPEAT_MODES.OFF)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [shuffledOrder, setShuffledOrder] = useState([])

  // Load playlist
  useEffect(() => {
    const loadPlaylist = async () => {
      try {
        const { data } = await dataProvider.getList('video-clip', {
          pagination: { page: 1, perPage: 100 },
          sort: { field: 'createdAt', order: 'DESC' },
          filter: {},
        })
        setPlaylist(data)
      } catch (error) {
        console.error('Failed to load playlist:', error)
      }
    }
    loadPlaylist()
  }, [dataProvider])

  // Update current index when record or playlist changes
  useEffect(() => {
    if (record && playlist.length > 0) {
      const index = playlist.findIndex((item) => item.id === record.id)
      setCurrentIndex(index)
    }
  }, [record, playlist])

  // Generate shuffled order when shuffle is enabled
  useEffect(() => {
    if (shuffle && playlist.length > 0) {
      const order = [...Array(playlist.length).keys()]
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      setShuffledOrder(order)
    }
  }, [shuffle, playlist.length])

  const getNextIndex = useCallback(() => {
    if (playlist.length === 0) return -1

    if (repeatMode === REPEAT_MODES.ONE) {
      return currentIndex
    }

    let nextIndex
    if (shuffle) {
      const currentShufflePos = shuffledOrder.indexOf(currentIndex)
      const nextShufflePos = (currentShufflePos + 1) % shuffledOrder.length
      nextIndex = shuffledOrder[nextShufflePos]
    } else {
      nextIndex = (currentIndex + 1) % playlist.length
    }

    if (nextIndex === 0 && repeatMode === REPEAT_MODES.OFF && !shuffle) {
      return -1 // Stop at end if repeat is off
    }

    return nextIndex
  }, [currentIndex, playlist.length, shuffle, shuffledOrder, repeatMode])

  const getPrevIndex = useCallback(() => {
    if (playlist.length === 0) return -1

    if (shuffle) {
      const currentShufflePos = shuffledOrder.indexOf(currentIndex)
      const prevShufflePos = (currentShufflePos - 1 + shuffledOrder.length) % shuffledOrder.length
      return shuffledOrder[prevShufflePos]
    }

    return (currentIndex - 1 + playlist.length) % playlist.length
  }, [currentIndex, playlist.length, shuffle, shuffledOrder])

  const playNext = useCallback(() => {
    const nextIndex = getNextIndex()
    if (nextIndex >= 0 && playlist[nextIndex]) {
      history.push(`/video-clip/${playlist[nextIndex].id}/show`)
    }
  }, [getNextIndex, playlist, history])

  const playPrev = useCallback(() => {
    const prevIndex = getPrevIndex()
    if (prevIndex >= 0 && playlist[prevIndex]) {
      history.push(`/video-clip/${playlist[prevIndex].id}/show`)
    }
  }, [getPrevIndex, playlist, history])

  const handleVideoEnd = useCallback(() => {
    playNext()
  }, [playNext])

  const handleVideoReady = useCallback((event) => {
    playerRef.current = event.target
    setIsVideoLoading(false)
  }, [])

  // When video starts playing, pause audio player
  const handleVideoPlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent(PAUSE_AUDIO_EVENT))
  }, [])

  // Listen for audio player start event and pause video
  useEffect(() => {
    const handlePauseVideo = () => {
      if (playerRef.current) {
        try {
          playerRef.current.pauseVideo()
        } catch (e) {
          console.warn('Could not pause video:', e)
        }
      }
    }

    window.addEventListener(PAUSE_VIDEO_EVENT, handlePauseVideo)
    return () => {
      window.removeEventListener(PAUSE_VIDEO_EVENT, handlePauseVideo)
    }
  }, [])

  const handleVideoError = useCallback((event) => {
    console.error('YouTube player error:', event)
    setIsVideoLoading(false)
    notify('Error loading video', { type: 'warning' })
  }, [notify])

  const toggleShuffle = () => {
    setShuffle(!shuffle)
  }

  const toggleRepeat = () => {
    const modes = [REPEAT_MODES.OFF, REPEAT_MODES.ALL, REPEAT_MODES.ONE]
    const currentModeIndex = modes.indexOf(repeatMode)
    setRepeatMode(modes[(currentModeIndex + 1) % modes.length])
  }

  const nextClip = playlist[getNextIndex()] || null

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.videoWrapper}>
          <div className={classes.videoContainer}>
            <div className={classes.loadingOverlay}>
              <CircularProgress />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className={classes.root}>
        <Typography>Video not found</Typography>
      </div>
    )
  }

  const youtubeOpts = {
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
    },
  }

  const pageTitle = translate('resources.video-clip.name', { smart_count: 2 })

  return (
    <div className={classes.root}>
      <PageTitle title={<Title subTitle={pageTitle} />} />
      <div className={classes.videoWrapper}>
        <div className={classes.videoContainer}>
          {isVideoLoading && (
            <div className={classes.loadingOverlay}>
              <CircularProgress />
            </div>
          )}
          {record.youtubeId && (
            <YouTube
              videoId={record.youtubeId}
              opts={youtubeOpts}
              onEnd={handleVideoEnd}
              onReady={handleVideoReady}
              onPlay={handleVideoPlay}
              onError={handleVideoError}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              iframeClassName={classes.videoIframe}
            />
          )}
        </div>
      </div>

      <div className={classes.infoContainer}>
        <Typography className={classes.title}>{record.title}</Typography>
        {record.artist && (
          <Typography className={classes.artist}>{record.artist}</Typography>
        )}
        {record.channelName && record.channelId && (
          <Typography className={classes.channelName}>
            Канал на YouTube:{' '}
            <a
              href={`https://www.youtube.com/channel/${record.channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.channelLink}
            >
              {record.channelName}
            </a>
          </Typography>
        )}
        {record.channelName && !record.channelId && (
          <Typography className={classes.channelName}>
            {record.channelName}
          </Typography>
        )}

        <div className={classes.controls}>
          <IconButton
            className={`${classes.controlButton} ${shuffle ? classes.activeControl : ''}`}
            onClick={toggleShuffle}
            size={isMobile ? 'small' : 'medium'}
          >
            <ShuffleIcon />
          </IconButton>

          <IconButton
            className={classes.controlButton}
            onClick={playPrev}
            disabled={playlist.length <= 1}
            size={isMobile ? 'small' : 'medium'}
          >
            <NavigateBeforeIcon fontSize="large" />
          </IconButton>

          <IconButton
            className={classes.controlButton}
            onClick={playNext}
            disabled={playlist.length <= 1}
            size={isMobile ? 'small' : 'medium'}
          >
            <NavigateNextIcon fontSize="large" />
          </IconButton>

          <IconButton
            className={`${classes.controlButton} ${repeatMode !== REPEAT_MODES.OFF ? classes.activeControl : ''}`}
            onClick={toggleRepeat}
            size={isMobile ? 'small' : 'medium'}
          >
            {repeatMode === REPEAT_MODES.ONE ? <RepeatOneIcon /> : <RepeatIcon />}
          </IconButton>
        </div>

        {record.description && (
          <div className={classes.description}>{record.description}</div>
        )}

        {nextClip && (
          <div className={classes.nextUpContainer}>
            <Typography className={classes.nextUpTitle}>
              {shuffle ? 'Next (Shuffled)' : 'Next Up'}
            </Typography>
            <div
              className={classes.nextUpItem}
              onClick={() => history.push(`/video-clip/${nextClip.id}/show`)}
            >
              <img
                src={nextClip.thumbnailUrl || `https://i.ytimg.com/vi/${nextClip.youtubeId}/hqdefault.jpg`}
                alt={nextClip.title}
                className={classes.nextUpThumbnail}
              />
              <div className={classes.nextUpInfo}>
                <Typography className={classes.nextUpItemTitle}>
                  {nextClip.title}
                </Typography>
                {nextClip.artist && (
                  <Typography className={classes.nextUpItemArtist}>
                    {nextClip.artist}
                  </Typography>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoClipShow
