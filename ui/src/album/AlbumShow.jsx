import React, { useEffect, useState } from 'react'
import {
  ReferenceManyField,
  ShowContextProvider,
  useShowContext,
  useShowController,
  Title as RaTitle,
  useDataProvider,
} from 'react-admin'
import { makeStyles } from '@material-ui/core/styles'
import { useHistory, useParams } from 'react-router-dom'
import AlbumSongs from './AlbumSongs'
import AlbumDetails from './AlbumDetails'
import AlbumActions from './AlbumActions'
import { useResourceRefresh, Title } from '../common'

const useStyles = makeStyles(
  (theme) => ({
    albumActions: {
      width: '100%',
    },
  }),
  {
    name: 'NDAlbumShow',
  },
)

const AlbumShowLayout = (props) => {
  const { loading, ...context } = useShowContext(props)
  const { record, id: showId } = context
  const classes = useStyles()
  const history = useHistory()
  const { id } = useParams()
  const dataProvider = useDataProvider()
  const [aliasRecord, setAliasRecord] = useState(null)
  useResourceRefresh('album', 'song')

  // Load album data directly if React Admin fails to load it
  useEffect(() => {
    if (!loading && !record && id && id !== showId) {
      dataProvider.getOne('album', { id })
        .then((response) => {
          setAliasRecord(response.data)
        })
        .catch((error) => {
          console.error('Error loading album:', error)
        })
    }
  }, [loading, record, id, showId, dataProvider])

  // If URL contains alias, redirect to UUID-based URL
  useEffect(() => {
    const currentRecord = record || aliasRecord
    
    // Only redirect when data is loaded and we have a mismatch
    if (!loading && currentRecord && currentRecord.id && id !== currentRecord.id) {
      // URL has alias, but record has UUID - redirect to UUID URL
      history.replace(`/album/${currentRecord.id}/show`)
    }
  }, [loading, record, aliasRecord, id, showId, history])

  return (
    <>
      {record && <RaTitle title={<Title subTitle={record.name} />} />}
      {record && <AlbumDetails {...context} />}
      {record && (
        <ReferenceManyField
          {...context}
          addLabel={false}
          reference="song"
          target="album_id"
          sort={{ field: 'album', order: 'ASC' }}
          perPage={0}
          pagination={null}
        >
          <AlbumSongs
            resource={'song'}
            exporter={false}
            album={record}
            actions={
              <AlbumActions className={classes.albumActions} record={record} />
            }
          />
        </ReferenceManyField>
      )}
    </>
  )
}

const AlbumShow = (props) => {
  const controllerProps = useShowController(props)
  return (
    <ShowContextProvider value={controllerProps}>
      <AlbumShowLayout {...props} {...controllerProps} />
    </ShowContextProvider>
  )
}

export default AlbumShow
