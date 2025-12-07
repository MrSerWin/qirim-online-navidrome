import React from 'react'
import { ImageList, ImageListItem, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import withWidth from '@material-ui/core/withWidth'
import { useListContext, Loading } from 'react-admin'
import { useHistory } from 'react-router-dom'

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
    channelName: {
      fontSize: '11px',
      color: theme.palette.type === 'dark' ? '#999' : '#888',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      marginTop: theme.spacing(0.5),
    },
    duration: {
      position: 'absolute',
      bottom: theme.spacing(1),
      right: theme.spacing(1),
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '2px 6px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
    },
    thumbnailWrapper: {
      position: 'relative',
    },
  }),
  { name: 'NDVideoClipGridView' },
)

const formatDuration = (seconds) => {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const VideoClipGridTile = ({ record }) => {
  const classes = useStyles()
  const history = useHistory()

  if (!record) {
    return null
  }

  const handleClick = () => {
    history.push(`/video-clip/${record.id}/show`)
  }

  // Use YouTube thumbnail or custom thumbnail
  const thumbnailUrl = record.thumbnailUrl ||
    (record.youtubeId ? `https://i.ytimg.com/vi/${record.youtubeId}/hqdefault.jpg` : null)

  return (
    <div className={classes.itemContainer} onClick={handleClick}>
      <div className={classes.thumbnailWrapper}>
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt={record.title}
            className={classes.thumbnail}
          />
        )}
        {record.duration > 0 && (
          <span className={classes.duration}>
            {formatDuration(record.duration)}
          </span>
        )}
      </div>
      <Typography className={classes.title}>{record.title}</Typography>
      {record.artist && (
        <Typography className={classes.artist}>{record.artist}</Typography>
      )}
      {record.channelName && (
        <Typography className={classes.channelName}>{record.channelName}</Typography>
      )}
    </div>
  )
}

const getColsForWidth = (width) => {
  if (width === 'xs') return 1
  if (width === 'sm') return 2
  if (width === 'md') return 3
  if (width === 'lg') return 4
  return 5
}

const LoadedVideoClipGrid = ({ ids, data, width }) => {
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
            <VideoClipGridTile record={data[id]} />
          </ImageListItem>
        ))}
      </ImageList>
    </div>
  )
}

const VideoClipGridView = ({ loaded, loading, ...props }) => {
  const hide = loading || !props.data || !props.ids
  return hide ? <Loading /> : <LoadedVideoClipGrid {...props} />
}

const VideoClipGridViewWithWidth = withWidth()(VideoClipGridView)

export default VideoClipGridViewWithWidth
