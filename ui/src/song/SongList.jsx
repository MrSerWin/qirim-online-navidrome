import { useMemo } from 'react'
import {
  AutocompleteArrayInput,
  Filter,
  FunctionField,
  NumberField,
  ReferenceArrayInput,
  SearchInput,
  TextField,
  useTranslate,
  NullableBooleanInput,
  usePermissions,
  useListContext,
} from 'react-admin'
import { useMediaQuery } from '@material-ui/core'
import FavoriteIcon from '@material-ui/icons/Favorite'
import {
  DateField,
  DurationField,
  List,
  SongContextMenu,
  SongDatagrid,
  SongInfo,
  QuickFilter,
  SongTitleField,
  SongSimpleList,
  RatingField,
  useResourceRefresh,
  ArtistLinkField,
  PathField,
} from '../common'
import { useDispatch } from 'react-redux'
import { makeStyles } from '@material-ui/core/styles'
import FavoriteBorderIcon from '@material-ui/icons/FavoriteBorder'
import { setTrack, playTracks } from '../actions'
import { SongListActions } from './SongListActions'
import { AlbumLinkField } from './AlbumLinkField'
import { SongBulkActions, QualityInfo, useSelectedFields } from '../common'
import config from '../config'
import ExpandInfoDialog from '../dialogs/ExpandInfoDialog'
import { useAutoLoadQueue } from './useAutoLoadQueue'

const useStyles = makeStyles({
  contextHeader: {
    marginLeft: '3px',
    marginTop: '-2px',
    verticalAlign: 'text-top',
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
  chip: {
    margin: 0,
    height: '24px',
  },
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

const SongFilter = (props) => {
  const classes = useStyles()
  const translate = useTranslate()
  const { permissions } = usePermissions()
  const isAdmin = permissions === 'admin'
  return (
    // <Filter {...props} variant={'outlined'}>
    //   <SearchInput source="title" alwaysOn />

    <Filter {...props} variant={'outlined'} className={classes.filterComponent}>
      <SearchInput
        source="title"
        alwaysOn
        className={classes.searchComponent}
      />
      {/* <ReferenceArrayInput
        label={translate('resources.song.fields.genre')}
        source="genre_id"
        reference="genre"
        perPage={0}
        sort={{ field: 'name', order: 'ASC' }}
        filterToQuery={(searchText) => ({ name: [searchText] })}
      >
        <AutocompleteArrayInput emptyText="-- None --" classes={classes} />
      </ReferenceArrayInput>
      <ReferenceArrayInput
        label={translate('resources.song.fields.grouping')}
        source="grouping"
        reference="tag"
        perPage={0}
        sort={{ field: 'tagValue', order: 'ASC' }}
        filter={{ tag_name: 'grouping' }}
        filterToQuery={(searchText) => ({
          tag_value: [searchText],
        })}
      >
        <AutocompleteArrayInput
          emptyText="-- None --"
          classes={classes}
          optionText="tagValue"
        />
      </ReferenceArrayInput>
      <ReferenceArrayInput
        label={translate('resources.song.fields.mood')}
        source="mood"
        reference="tag"
        perPage={0}
        sort={{ field: 'tagValue', order: 'ASC' }}
        filter={{ tag_name: 'mood' }}
        filterToQuery={(searchText) => ({
          tag_value: [searchText],
        })}
      >
        <AutocompleteArrayInput
          emptyText="-- None --"
          classes={classes}
          optionText="tagValue"
        />
      </ReferenceArrayInput>
      {config.enableFavourites && (
        <QuickFilter
          source="starred"
          label={<FavoriteIcon fontSize={'small'} />}
          defaultValue={true}
        />
      )}
      {isAdmin && <NullableBooleanInput source="missing" />} */}
    </Filter>
  )
}

const SongListContent = () => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  const { data, ids, total, loaded } = useListContext()

  // Auto-load next page when queue is near end
  useAutoLoadQueue({ resource: 'song', threshold: 10 })

  const handleRowClick = (id, basePath, record) => {
    // Play all songs in the list starting from the clicked one
    if (!data || !ids) {
      // eslint-disable-next-line no-console
      console.error('No data or ids available')
      return
    }
    dispatch(playTracks(data, ids, id))
  }

  const toggleableFields = useMemo(() => {
    return {
      album: isDesktop && <AlbumLinkField source="album" sortByOrder={'ASC'} />,
      artist: <ArtistLinkField source="artist" />,
      albumArtist: <ArtistLinkField source="albumArtist" />,
      trackNumber: isDesktop && <NumberField source="trackNumber" />,
      playCount: isDesktop && (
        <NumberField source="playCount" sortByOrder={'DESC'} />
      ),
      playDate: <DateField source="playDate" sortByOrder={'DESC'} showTime />,
      year: isDesktop && (
        <FunctionField
          source="year"
          render={(r) => r.year || ''}
          sortByOrder={'DESC'}
        />
      ),
      quality: isDesktop && <QualityInfo source="quality" sortable={false} />,
      channels: isDesktop && (
        <NumberField source="channels" sortByOrder={'ASC'} />
      ),
      duration: <DurationField source="duration" />,
      rating: config.enableStarRating && (
        <RatingField
          source="rating"
          sortByOrder={'DESC'}
          resource={'song'}
          className={classes.ratingField}
        />
      ),
      bpm: isDesktop && <NumberField source="bpm" />,
      genre: <TextField source="genre" />,
      mood: isDesktop && (
        <FunctionField
          source="mood"
          render={(r) => r.tags?.mood?.[0] || ''}
          sortable={false}
        />
      ),
      comment: <TextField source="comment" />,
      path: <PathField source="path" />,
      createdAt: (
        <DateField source="createdAt" sortBy="recently_added" showTime />
      ),
    }
  }, [isDesktop, classes.ratingField])

  const columns = useSelectedFields({
    resource: 'song',
    columns: toggleableFields,
    defaultOff: [
      'channels',
      'bpm',
      'playDate',
      'albumArtist',
      'genre',
      'mood',
      'comment',
      'path',
      'createdAt',
    ],
  })

  return (
    <>
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

const SongList = (props) => {
  const isXsmall = useMediaQuery((theme) => theme.breakpoints.down('xs'))
  useResourceRefresh('song')

  return (
    <List
      {...props}
      sort={{ field: 'title', order: 'ASC' }}
      exporter={false}
      bulkActionButtons={<SongBulkActions />}
      actions={<SongListActions />}
      filters={<SongFilter />}
      perPage={isXsmall ? 100 : 50}
    >
      <SongListContent />
    </List>
  )
}

export default SongList
