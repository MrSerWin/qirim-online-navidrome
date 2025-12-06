import React from 'react'
import { Filter, SearchInput, Pagination, useTranslate } from 'react-admin'
import { withWidth } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { List, Title } from '../common'
import VideoClipGridView from './VideoClipGridView'

const useStyles = makeStyles({
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
})

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

const VideoClipList = (props) => {
  const { width } = props

  return (
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
  )
}

const VideoClipListWithWidth = withWidth()(VideoClipList)

export default VideoClipListWithWidth
