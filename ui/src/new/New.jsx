import React, { useMemo } from 'react'
import {
  Box,
  Typography,
  makeStyles,
  useMediaQuery,
} from '@material-ui/core'
import { useListContext, Title as PageTitle, useTranslate } from 'react-admin'
import { Title } from '../common/Title'
import {
  List,
  SongContextMenu,
  SongDatagrid,
  SongTitleField,
  SongSimpleList,
  RatingField,
  ArtistLinkField,
  DurationField,
  DateField,
  useSelectedFields,
} from '../common'
import { useDispatch } from 'react-redux'
import { setTrack, playTracks } from '../actions'
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder'
import config from '../config'
import ExpandInfoDialog from '../dialogs/ExpandInfoDialog'
import { SongInfo } from '../common'

const useStyles = makeStyles((theme) => ({
  root: {
    '& .RaList-main': {
      paddingTop: 0,
    },
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: theme.spacing(4, 3),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(3),
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(3, 2),
      marginBottom: theme.spacing(2),
      borderRadius: theme.spacing(1),
    },
  },
  headerTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(0.5),
    position: 'relative',
    zIndex: 1,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.75rem',
    },
  },
  headerSubtitle: {
    fontSize: '1.2rem',
    fontWeight: 300,
    opacity: 0.95,
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1rem',
    },
  },
  row: {
    '&:hover': {
      '& $contextMenu': {
        visibility: 'visible',
      },
      '& $ratingField': {
        visibility: 'visible',
      },
    },
  },
  contextMenu: {
    visibility: 'hidden',
  },
  ratingField: {
    visibility: 'hidden',
  },
  contextHeader: {
    marginLeft: '3px',
    marginTop: '-2px',
    verticalAlign: 'text-top',
  },
}))

const NewListContent = () => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const translate = useTranslate()
  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  const { data, ids, total, loaded } = useListContext()

  const handleRowClick = (id) => {
    const allSongIds = ids
    const index = allSongIds.indexOf(id)
    const songsToPlay = [...allSongIds.slice(index), ...allSongIds.slice(0, index)]
    dispatch(setTrack(id))
    dispatch(playTracks(data, songsToPlay))
    return false
  }

  const toggleableFields = useMemo(() => {
    return {
      artist: <ArtistLinkField source="artist" />,
      createdAt: (
        <DateField source="createdAt" sortBy="recently_added" showTime label="Добавлено" />
      ),
      duration: <DurationField source="duration" />,
      rating: (
        <RatingField
          source="rating"
          resource="song"
          className={classes.ratingField}
        />
      ),
    }
  }, [isDesktop, classes.ratingField])

  const columns = useSelectedFields({
    resource: 'song',
    columns: toggleableFields,
    defaultOff: [],
  })

  return (
    <>
      <Box className={classes.header}>
        <Typography className={classes.headerTitle}>
          ✨ {translate('menu.new.title')}
        </Typography>
        <Typography className={classes.headerSubtitle}>
          {translate('menu.new.subtitle')}
        </Typography>
      </Box>

      {isXsmall ? (
        <SongSimpleList
          data={data}
          ids={ids}
          total={total}
          loaded={loaded}
          hasBulkActions={false}
          selectedIds={[]}
        />
      ) : (
        <SongDatagrid
          rowClick={handleRowClick}
          contextAlwaysVisible={!isDesktop}
          classes={{ row: classes.row }}
        >
          <SongTitleField source="title" showTrackNumbers={false} />
          {columns}
          <SongContextMenu
            source={'starred_at'}
            sortByOrder={'DESC'}
            sortable={config.enableFavourites}
            className={classes.contextMenu}
            label={
              config.enableFavourites && (
                <FavoriteBorderIcon
                  fontSize={'small'}
                  className={classes.contextHeader}
                />
              )
            }
          />
        </SongDatagrid>
      )}
      <ExpandInfoDialog content={<SongInfo />} />
    </>
  )
}

const New = (props) => {
  const classes = useStyles()
  const translate = useTranslate()
  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))

  return (
    <>
      <PageTitle title={<Title subTitle={translate('menu.new.name')} />} />
      <Box className={classes.root}>
        <List
          {...props}
          resource="song"
          basePath="/song"
          title=" "
          sort={{ field: 'createdAt', order: 'DESC' }}
          exporter={false}
          bulkActionButtons={false}
          actions={null}
          filters={null}
          perPage={50}
          pagination={null}
        >
          <NewListContent />
        </List>
      </Box>
    </>
  )
}

export default New
