import { useEffect, useState } from 'react'
import { useNotify, useDataProvider, Title as PageTitle } from 'react-admin'
import { useDispatch } from 'react-redux'
import { useParams, Link } from 'react-router-dom'
import { playTracks } from '../actions'
import {
  CircularProgress,
  Box,
  Card,
  Typography,
  Button,
  makeStyles
} from '@material-ui/core'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import subsonic from '../subsonic'
import { lyricsApi } from '../lyrics/lyricsApi'
import { Title } from '../common/Title'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 900,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #2b2b2b 0%, #1e1e1e 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.1)',
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
    },
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: theme.shape.borderRadius,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    objectFit: 'cover',
    flexShrink: 0,
    [theme.breakpoints.down('sm')]: {
      width: 180,
      height: 180,
    },
  },
  songInfo: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
  },
  songTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    color: theme.palette.text.primary,
    lineHeight: 1.2,
  },
  artistName: {
    fontSize: '1.25rem',
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(0.5),
    fontWeight: 600,
    '& a': {
      color: 'inherit',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
  meta: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    '& a': {
      color: 'inherit',
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
  playButton: {
    minWidth: 140,
    height: 48,
    borderRadius: 24,
    fontSize: '0.9rem',
    fontWeight: 600,
    textTransform: 'none',
    transition: 'all 0.2s ease',
    '&:hover': {
      transform: 'scale(1.02)',
    },
  },
  lyricsSection: {
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    background: theme.palette.type === 'dark'
      ? '#2b2b2b'
      : '#ffffff',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.1)',
  },
  lyricsSectionHeader: {
    fontSize: '1rem',
    fontWeight: 700,
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: theme.palette.text.primary,
  },
  lyricsContent: {
    whiteSpace: 'pre-wrap',
    fontSize: '1.05rem',
    lineHeight: 2,
    color: theme.palette.text.primary,
  },
  noLyrics: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
  },
}))

const SongLyrics = () => {
  const { id } = useParams()
  const classes = useStyles()
  const dispatch = useDispatch()
  const notify = useNotify()
  const dataProvider = useDataProvider()
  const [loading, setLoading] = useState(true)
  const [song, setSong] = useState(null)
  const [lyrics, setLyrics] = useState(null)
  const [albumSongs, setAlbumSongs] = useState(null)

  useEffect(() => {
    loadSongAndLyrics()
  }, [id])

  const loadSongAndLyrics = async () => {
    setLoading(true)
    try {
      // Load the song by ID
      const response = await dataProvider.getOne('song', { id })
      const songData = response.data
      setSong(songData)

      // Load lyrics from crowdsource API
      try {
        const approvedLyrics = await lyricsApi.getApproved(songData.id)
        setLyrics(approvedLyrics)
      } catch (lyricsErr) {
        console.log('No approved lyrics found:', lyricsErr)
        setLyrics(null)
      }

      // Load all songs from the album for queue
      if (songData.albumId) {
        const albumResponse = await dataProvider.getList('song', {
          pagination: { page: 1, perPage: 1000 },
          sort: { field: 'trackNumber', order: 'ASC' },
          filter: { album_id: songData.albumId },
        })
        setAlbumSongs(albumResponse.data)
      }
    } catch (error) {
      console.error('Error loading song:', error)
      notify('ra.notification.item_doesnt_exist', { type: 'warning' })
      window.location.hash = '/song'
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = () => {
    if (!song) return

    const data = {}
    if (albumSongs && albumSongs.length > 0) {
      albumSongs.forEach((s) => {
        data[s.id] = s
      })
    } else {
      data[song.id] = song
    }

    dispatch(playTracks(data, null, song.id))
  }

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

  const formatDuration = (seconds) => {
    if (!seconds) return ''
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Clean lyrics content - remove lines starting with #
  const cleanLyrics = (content) => {
    if (!content) return ''
    return content
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .join('\n')
      .trim()
  }

  if (loading) {
    return (
      <Box className={classes.loadingContainer}>
        <CircularProgress />
      </Box>
    )
  }

  if (!song) {
    return null
  }

  const lyricsContent = lyrics ? cleanLyrics(lyrics.content) : null

  return (
    <Box className={classes.root}>
      <PageTitle title={<Title subTitle={song.title} />} />

      {/* Song Header */}
      <Box className={classes.header}>
        <img
          src={getCoverUrl()}
          alt={song.album}
          className={classes.cover}
          onError={(e) => {
            e.target.src = '/album-placeholder.webp'
          }}
        />
        <Box className={classes.songInfo}>
          <Typography className={classes.songTitle}>
            {song.title}
          </Typography>
          <Typography className={classes.artistName}>
            <Link to={`/artist/${song.artistId}/show`}>
              {song.artist}
            </Link>
          </Typography>
          <Typography className={classes.meta}>
            {song.album && (
              <Link to={`/album/${song.albumId}/show`}>
                {song.album}
              </Link>
            )}
            {song.year ? ` • ${song.year}` : ''}
            {song.duration ? ` • ${formatDuration(song.duration)}` : ''}
          </Typography>
          <Box>
            <Button
              className={classes.playButton}
              variant="contained"
              color="primary"
              onClick={handlePlay}
              startIcon={<PlayArrowIcon />}
            >
              Слушать
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Lyrics Section */}
      <Card className={classes.lyricsSection}>
        <Typography className={classes.lyricsSectionHeader}>
          Текст песни
        </Typography>
        {lyricsContent ? (
          <Box className={classes.lyricsContent}>
            {lyricsContent}
          </Box>
        ) : (
          <Box className={classes.noLyrics}>
            <Typography>
              Текст песни пока недоступен
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  )
}

export default SongLyrics
