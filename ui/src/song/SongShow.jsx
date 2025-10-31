import { useEffect, useState } from 'react'
import { useNotify, useDataProvider } from 'react-admin'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'
import { playTracks } from '../actions'
import {
  CircularProgress,
  Box,
  Card,
  CardMedia,
  Typography,
  Button,
  makeStyles
} from '@material-ui/core'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import subsonic from '../subsonic'

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '70vh',
    padding: theme.spacing(2),
  },
  card: {
    maxWidth: 600,
    width: '100%',
    textAlign: 'center',
    padding: theme.spacing(4),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 8px 32px rgba(0, 0, 0, 0.4)'
      : '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  coverContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  cover: {
    width: 300,
    height: 300,
    borderRadius: '50%',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    objectFit: 'cover',
  },
  songTitle: {
    fontSize: '2rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  artistName: {
    fontSize: '1.5rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  albumName: {
    fontSize: '1.1rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(4),
    opacity: 0.8,
  },
  playButton: {
    minWidth: 200,
    height: 64,
    borderRadius: 32,
    fontSize: '1.1rem',
    fontWeight: 600,
    textTransform: 'none',
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4),
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(255, 255, 255, 0.1)'
      : '0 4px 20px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    background: theme.palette.primary.main,
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 24px rgba(255, 255, 255, 0.15)'
        : '0 8px 24px rgba(0, 0, 0, 0.2)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  playIcon: {
    fontSize: '2rem',
    marginRight: theme.spacing(1),
  },
}))

const SongShow = () => {
  const { id } = useParams()
  const classes = useStyles()
  const dispatch = useDispatch()
  const notify = useNotify()
  const dataProvider = useDataProvider()
  const [loading, setLoading] = useState(true)
  const [song, setSong] = useState(null)
  const [albumSongs, setAlbumSongs] = useState(null)

  useEffect(() => {
    // Load the song by ID or alias
    dataProvider
      .getOne('song', { id })
      .then((response) => {
        const songData = response.data
        setSong(songData)

        // Load all songs from the album to prepare the queue
        if (songData.albumId) {
          return dataProvider
            .getList('song', {
              pagination: { page: 1, perPage: 1000 },
              sort: { field: 'trackNumber', order: 'ASC' },
              filter: { album_id: songData.albumId },
            })
            .then((albumResponse) => {
              setAlbumSongs(albumResponse.data)
              setLoading(false)
            })
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error('Error loading song:', error)
        notify('ra.notification.item_doesnt_exist', { type: 'warning' })
        window.location.hash = '/song'
        setLoading(false)
      })
  }, [id, dataProvider, notify])

  const handlePlay = () => {
    if (!song) return

    // Create data object with all album songs or just this song
    const data = {}
    if (albumSongs && albumSongs.length > 0) {
      albumSongs.forEach((s) => {
        data[s.id] = s
      })
    } else {
      data[song.id] = song
    }

    // Start playing from the selected song
    dispatch(playTracks(data, null, song.id))

    // Redirect to album or artist page after starting playback
    setTimeout(() => {
      if (song.albumId) {
        window.location.hash = `/album/${song.albumId}/show`
      } else {
        window.location.hash = '/song'
      }
    }, 300)
  }

  // Get cover art URL
  const getCoverUrl = () => {
    if (!song) return ''
    return subsonic.getCoverArtUrl(
      {
        id: song.id,
        updatedAt: song.updatedAt,
        album: song.album,
      },
      300,
    )
  }

  // Show loading spinner while loading
  if (loading) {
    return (
      <Box className={classes.root}>
        <CircularProgress />
      </Box>
    )
  }

  if (!song) {
    return null
  }

  // Show beautiful song page with Play button
  return (
    <Box className={classes.root}>
      <Card className={classes.card}>
        <Box className={classes.coverContainer}>
          <img
            src={getCoverUrl()}
            alt={song.album}
            className={classes.cover}
            onError={(e) => {
              e.target.src = '/album-placeholder.webp'
            }}
          />
        </Box>

        <Typography className={classes.songTitle}>
          {song.title}
        </Typography>

        <Typography className={classes.artistName}>
          {song.artist}
        </Typography>

        {song.album && (
          <Typography className={classes.albumName}>
            {song.album}
          </Typography>
        )}

        <Box display="flex" justifyContent="center" mt={4}>
          <Button
            className={classes.playButton}
            variant="contained"
            color="primary"
            onClick={handlePlay}
            startIcon={<PlayArrowIcon className={classes.playIcon} />}
            aria-label="Play"
          >
            Слушать
          </Button>
        </Box>
      </Card>
    </Box>
  )
}

export default SongShow
