import React, { useState } from 'react'
import {
  ImageList,
  ImageListItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import withWidth from '@material-ui/core/withWidth'
import { useListContext, Loading } from 'react-admin'

const useStyles = makeStyles(
  (theme) => ({
    root: {
      margin: '20px',
      display: 'grid',
    },
    itemContainer: {
      border: `1px solid ${theme.palette.divider}`,
      boxSizing: 'border-box',
      padding: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
      transition: 'box-shadow 180ms ease, border-color 120ms ease',
      cursor: 'pointer',
      '&:hover': {
        background: theme.palette.action.hover,
      },
      '&:active': {
        borderColor: theme.palette.primary.main,
      },
    },
    thumbnail: {
      width: '100%',
      height: 'auto',
      aspectRatio: '16 / 9',
      objectFit: 'cover',
      borderRadius: theme.shape.borderRadius,
    },
    title: {
      fontSize: '14px',
      color: theme.palette.type === 'dark' ? '#eee' : 'black',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      marginTop: theme.spacing(1),
      fontWeight: 600,
    },
    artist: {
      fontSize: '12px',
      color: theme.palette.type === 'dark' ? '#c5c5c5' : '#696969',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    },
    videoContainer: {
      width: '100%',
      aspectRatio: '16 / 9',
      '& iframe': {
        width: '100%',
        height: '100%',
      },
    },
  }),
  { name: 'NDKaraokeGridView' },
)

const getYouTubeVideoId = (url) => {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

const YouTubeThumbnail = ({ url, className }) => {
  const id = getYouTubeVideoId(url)
  if (!id) return null
  return (
    <img
      src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
      alt="thumbnail"
      className={className}
    />
  )
}

const KaraokeGridTile = ({ record }) => {
  const classes = useStyles()
  const [open, setOpen] = useState(false)

  if (!record) {
    return null
  }

  const videoId = getYouTubeVideoId(record.youtubeUrl)

  return (
    <>
      <div className={classes.itemContainer} onClick={() => setOpen(true)}>
        <YouTubeThumbnail url={record.youtubeUrl} className={classes.thumbnail} />
        <Typography className={classes.title}>{record.title}</Typography>
        <Typography className={classes.artist}>{record.artist}</Typography>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{record.title}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" color="textSecondary" gutterBottom>
            {record.artist}
          </Typography>
          <div className={classes.videoContainer}>
            {videoId ? (
              <iframe
                title={record.title}
                src={`https://www.youtube.com/embed/${videoId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <Typography>Invalid YouTube URL</Typography>
            )}
          </div>
          <Button
            variant="contained"
            onClick={() => setOpen(false)}
            style={{ marginTop: 16 }}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

const getColsForWidth = (width) => {
  if (width === 'xs') return 1
  if (width === 'sm') return 2
  if (width === 'md') return 3
  if (width === 'lg') return 4
  return 5
}

const LoadedKaraokeGrid = ({ ids, data, width }) => {
  const classes = useStyles()
  return (
    <div className={classes.root}>
      <ImageList
        component={'div'}
        rowHeight={'auto'}
        cols={getColsForWidth(width)}
        gap={20}
      >
        {ids.map((id) => (
          <ImageListItem key={id}>
            <KaraokeGridTile record={data[id]} />
          </ImageListItem>
        ))}
      </ImageList>
    </div>
  )
}

const KaraokeGridView = ({ loaded, loading, ...props }) => {
  const hide = loading || !props.data || !props.ids
  return hide ? <Loading /> : <LoadedKaraokeGrid {...props} />
}

const KaraokeGridViewWithWidth = withWidth()(KaraokeGridView)

export default KaraokeGridViewWithWidth
