import React, { useState, useEffect } from 'react'
import {
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  CircularProgress,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { useShowController, useDataProvider } from 'react-admin'
import { useHistory, useParams } from 'react-router-dom'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
  header: {
    display: 'flex',
    gap: theme.spacing(3),
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      flexDirection: 'column',
    },
  },
  playlistThumbnail: {
    width: 320,
    height: 180,
    objectFit: 'cover',
    borderRadius: theme.shape.borderRadius,
    [theme.breakpoints.down('sm')]: {
      width: '100%',
      height: 'auto',
      aspectRatio: '16/9',
    },
  },
  playlistInfo: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
  },
  playlistMeta: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
  },
  playlistDescription: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
    whiteSpace: 'pre-wrap',
    maxHeight: 100,
    overflow: 'auto',
  },
  clipsGrid: {
    marginTop: theme.spacing(2),
  },
  clipCard: {
    height: '100%',
  },
  clipThumbnail: {
    aspectRatio: '16/9',
  },
  clipTitle: {
    fontSize: '0.9rem',
    fontWeight: 500,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  clipArtist: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  channelBadge: {
    display: 'inline-block',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: '4px 12px',
    borderRadius: 4,
    fontSize: '0.8rem',
    marginTop: theme.spacing(1),
  },
}))

const VideoPlaylistShow = (props) => {
  const classes = useStyles()
  const history = useHistory()
  const { id } = useParams()
  const dataProvider = useDataProvider()

  const { record, loading } = useShowController({
    ...props,
    resource: 'video-playlist',
    id,
  })

  const [clips, setClips] = useState([])
  const [clipsLoading, setClipsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      setClipsLoading(true)
      // Fetch clips for this playlist
      fetch(`/api/video-playlist/${id}/clips`)
        .then((res) => res.json())
        .then((data) => {
          setClips(data || [])
          setClipsLoading(false)
        })
        .catch((err) => {
          console.error('Failed to load clips:', err)
          setClipsLoading(false)
        })
    }
  }, [id])

  if (loading) {
    return (
      <div className={classes.loadingContainer}>
        <CircularProgress />
      </div>
    )
  }

  if (!record) {
    return (
      <div className={classes.root}>
        <Typography>Playlist not found</Typography>
      </div>
    )
  }

  const thumbnailUrl = record.thumbnailUrl ||
    (clips.length > 0 && clips[0].youtubeId
      ? `https://i.ytimg.com/vi/${clips[0].youtubeId}/hqdefault.jpg`
      : '')

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={record.title}
            className={classes.playlistThumbnail}
          />
        )}
        <div className={classes.playlistInfo}>
          <Typography className={classes.playlistTitle}>
            {record.title}
          </Typography>
          <Typography className={classes.playlistMeta}>
            {record.channelName && `${record.channelName} • `}
            {record.videoCount} videos
          </Typography>
          {record.isChannelVideos && (
            <div className={classes.channelBadge}>
              Channel Videos
            </div>
          )}
          {record.description && (
            <Typography className={classes.playlistDescription}>
              {record.description}
            </Typography>
          )}
        </div>
      </div>

      {clipsLoading ? (
        <div className={classes.loadingContainer}>
          <CircularProgress />
        </div>
      ) : (
        <Grid container spacing={2} className={classes.clipsGrid}>
          {clips.map((clip) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={clip.id}>
              <Card className={classes.clipCard}>
                <CardActionArea
                  onClick={() => history.push(`/video-clip/${clip.id}/show`)}
                >
                  <CardMedia
                    component="img"
                    className={classes.clipThumbnail}
                    image={
                      clip.thumbnailUrl ||
                      `https://i.ytimg.com/vi/${clip.youtubeId}/hqdefault.jpg`
                    }
                    alt={clip.title}
                  />
                  <CardContent>
                    <Typography className={classes.clipTitle}>
                      {clip.title}
                    </Typography>
                    {clip.artist && (
                      <Typography className={classes.clipArtist}>
                        {clip.artist}
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  )
}

export default VideoPlaylistShow
