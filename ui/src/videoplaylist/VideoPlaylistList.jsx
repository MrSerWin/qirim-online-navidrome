import React from 'react'
import {
  Datagrid,
  List,
  TextField,
  NumberField,
  DateField,
  SearchInput,
  useRecordContext,
} from 'react-admin'
import { Link } from 'react-router-dom'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
  thumbnail: {
    width: 120,
    height: 68,
    objectFit: 'cover',
    borderRadius: 4,
  },
  title: {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  channelBadge: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: '0.75rem',
    marginLeft: theme.spacing(1),
  },
}))

const ThumbnailField = () => {
  const record = useRecordContext()
  const classes = useStyles()

  if (!record) return null

  const thumbnailUrl = record.thumbnailUrl ||
    (record.youtubeId ? `https://i.ytimg.com/vi/${record.youtubeId}/hqdefault.jpg` : '')

  return thumbnailUrl ? (
    <img src={thumbnailUrl} alt={record.title} className={classes.thumbnail} />
  ) : null
}

const TitleField = () => {
  const record = useRecordContext()
  const classes = useStyles()

  if (!record) return null

  return (
    <Link to={`/video-playlist/${record.id}/show`} className={classes.title}>
      {record.title}
      {record.isChannelVideos && (
        <span className={classes.channelBadge}>Channel</span>
      )}
    </Link>
  )
}

const filters = [
  <SearchInput source="q" alwaysOn />,
]

const VideoPlaylistList = (props) => {
  return (
    <List
      {...props}
      filters={filters}
      sort={{ field: 'createdAt', order: 'DESC' }}
      perPage={25}
      exporter={false}
    >
      <Datagrid rowClick="show">
        <ThumbnailField label="resources.video-playlist.fields.thumbnail" />
        <TitleField label="resources.video-playlist.fields.title" />
        <TextField source="channelName" label="resources.video-playlist.fields.channelName" />
        <NumberField source="videoCount" label="resources.video-playlist.fields.videoCount" />
        <DateField source="createdAt" label="resources.video-playlist.fields.createdAt" />
      </Datagrid>
    </List>
  )
}

export default VideoPlaylistList
