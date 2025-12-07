import React from 'react'
import { Filter, SearchInput, Pagination, useTranslate } from 'react-admin'
import { withWidth, Button } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay'
import { useHistory } from 'react-router-dom'
import { List, Title } from '../common'
import VideoClipGridView from './VideoClipGridView'

const useStyles = makeStyles((theme) => ({
  searchComponent: {
    width: '100%',
  },
  filterComponent: {
    width: '100%',
    marginLeft: '10px',
    '& .filter-field': {
      width: '100%',
    },
  },
  actionsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(1, 2),
    gap: theme.spacing(1),
  },
  playlistButton: {
    textTransform: 'none',
  },
}))

const VideoClipFilter = (props) => {
  const classes = useStyles()
  return (
    <Filter {...props} variant={'outlined'} className={classes.filterComponent}>
      <SearchInput
        id="search"
        source="q"
        alwaysOn
        className={classes.searchComponent}
        placeholder="Search clips..."
      />
    </Filter>
  )
}

const VideoClipListTitle = () => {
  const translate = useTranslate()
  const title = translate('resources.video-clip.name', { smart_count: 2 })
  return <Title subTitle={title} args={{ smart_count: 2 }} />
}

const VideoClipListActions = () => {
  const classes = useStyles()
  const history = useHistory()
  const translate = useTranslate()

  return (
    <div className={classes.actionsContainer}>
      <Button
        className={classes.playlistButton}
        startIcon={<PlaylistPlayIcon />}
        onClick={() => history.push('/video-playlist')}
        size="small"
        color="primary"
      >
        {translate('resources.video-playlist.name', { smart_count: 2, _: 'Playlists' })}
      </Button>
    </div>
  )
}

const VideoClipList = (props) => {
  const { width } = props

  return (
    <>
      <VideoClipListActions />
      <List
        {...props}
        exporter={false}
        bulkActionButtons={false}
        filters={<VideoClipFilter />}
        perPage={24}
        pagination={<Pagination rowsPerPageOptions={[12, 24, 48, 96]} />}
        title={<VideoClipListTitle />}
        sort={{ field: 'createdAt', order: 'DESC' }}
      >
        <VideoClipGridView width={width} />
      </List>
    </>
  )
}

const VideoClipListWithWidth = withWidth()(VideoClipList)

export default VideoClipListWithWidth
