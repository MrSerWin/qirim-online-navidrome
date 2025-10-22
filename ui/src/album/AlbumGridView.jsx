import React from 'react'
import {
  ImageList,
  ImageListItem,
  Typography,
  useMediaQuery,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import withWidth from '@material-ui/core/withWidth'
import { Link } from 'react-router-dom'
import IconButton from '@material-ui/core/IconButton'
import {
  linkToRecord,
  useListContext,
  Loading,
  useDataProvider,
} from 'react-admin'
import { withContentRect } from 'react-measure'
import { useDrag } from 'react-dnd'
import subsonic from '../subsonic'
import { AlbumContextMenu, PlayButton, ArtistLinkField } from '../common'
import { useDispatch } from 'react-redux'
import { playTracks } from '../actions'
import { DraggableTypes } from '../consts'
import clsx from 'clsx'
import { AlbumDatesField } from './AlbumDatesField.jsx'
import { generateAlbumURL } from '../utils/urlGenerator'

const useStyles = makeStyles(
  (theme) => ({
    root: {
      margin: '20px',
      display: 'grid',
    },
    tileBar: {
      transition: 'all 150ms ease-out',
      opacity: 0,
      textAlign: 'center',
      marginBottom: '3px',
      background:
        'linear-gradient(to top, rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.4) 70%,rgba(0,0,0,0) 100%)',
    },
    tileBarMobile: {
      textAlign: 'center',
      marginBottom: '3px',
      background:
        'linear-gradient(to top, rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.4) 70%,rgba(0,0,0,0) 100%)',
    },
    albumArtistName: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'center',
      fontSize: '1em',
    },
    albumName: {
      fontSize: '14px',
      color: theme.palette.type === 'dark' ? '#eee' : 'black',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      textAlign: 'center',
      display: 'block',
    },
    missingAlbum: {
      opacity: 0.3,
    },
    albumVersion: {
      fontSize: '12px',
      color: theme.palette.type === 'dark' ? '#c5c5c5' : '#696969',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      textAlign: 'center',
    },
    albumSubtitle: {
      fontSize: '12px',
      color: theme.palette.type === 'dark' ? '#c5c5c5' : '#696969',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      textAlign: 'center',
    },
    link: {
      position: 'relative',
      display: 'block',
      textDecoration: 'none',
    },
    albumLink: {
      position: 'relative',
      display: 'block',
      textDecoration: 'none',
      textAlign: 'center',
    },
    albumContainer: {
      border: `1px solid ${theme.palette.divider}`,
      boxSizing: 'border-box',
      // padding: theme.spacing(1),
      padding: '0.75rem 0',
      borderRadius: theme.shape.borderRadius,
      transition: 'box-shadow 180ms ease, border-color 120ms ease',
      '&:hover $tileBar': {
        opacity: 1,
      },
      '&:hover $overlayCenter': {
        opacity: 1,
        pointerEvents: 'auto',
        transform: 'translate(-50%, -50%) scale(1)',
      },
      '&:hover': {
        // boxShadow: theme.shadows[4],
        background: theme.palette.action.hover,
      },
      '&:active': {
        borderColor: theme.palette.primary.main,
      },
    },
    albumPlayButton: {
      color: '#b6b7c0',
      borderRadius: '50%',
      background: '#2e677d',

      '&:hover': {
        background: '#2e677d',
        opacity: 0.7,
        // background: theme.palette.action.hover,
      },
    },
    coverWrapper: {
      position: 'relative',
      width: '100%',
      display: 'block',
    },
    overlayCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      transition: 'opacity 150ms ease-out, transform 150ms ease-out',
      opacity: 0.2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3,
      pointerEvents: 'none',
    },
    overlayCenterMobile: {
      opacity: 0.65,
      pointerEvents: 'auto',
    },
    topRightActions: {
      position: 'absolute',
      top: theme.spacing(0.5),
      right: theme.spacing(0.5),
      zIndex: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
  }),
  { name: 'NDAlbumGridView' },
)

const useCoverStyles = makeStyles({
  cover: {
    display: 'block',
    width: '70%',
    height: 'auto',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    margin: '0 auto',
    transition: 'opacity 0.3s ease-in-out',
    borderRadius: '50%',
    backgroundColor: '#f3f3f3e6',
  },
  coverLoading: {
    opacity: 0.5,
  },
})

const getColsForWidth = (width) => {
  if (width === 'xs') return 2
  if (width === 'sm') return 3
  if (width === 'md') return 4
  if (width === 'lg') return 6
  return 9
}

const Cover = withContentRect('bounds')(({
  record,
  measureRef,
  contentRect,
}) => {
  // Force height to be the same as the width determined by the GridList
  // noinspection JSSuspiciousNameCombination
  const classes = useCoverStyles({ height: contentRect.bounds.width })
  const [imageLoading, setImageLoading] = React.useState(true)
  const [imageError, setImageError] = React.useState(false)
  const [, dragAlbumRef] = useDrag(
    () => ({
      type: DraggableTypes.ALBUM,
      item: { albumIds: [record.id] },
      options: { dropEffect: 'copy' },
    }),
    [record],
  )

  // Reset image state when record changes
  React.useEffect(() => {
    setImageLoading(true)
    setImageError(false)
  }, [record.id])

  const handleImageLoad = React.useCallback(() => {
    setImageLoading(false)
    setImageError(false)
  }, [])

  const handleImageError = React.useCallback(() => {
    setImageLoading(false)
    setImageError(true)
  }, [])

  return (
    <div ref={measureRef}>
      <div ref={dragAlbumRef}>
        <img
          key={record.id} // Force re-render when record changes
          src={subsonic.getCoverArtUrl(record, 300, true)}
          alt={record.name}
          className={`${classes.cover} ${imageLoading ? classes.coverLoading : ''}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    </div>
  )
})

const AlbumGridTile = ({ showArtist, record, basePath, ...props }) => {
  const classes = useStyles()
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'), {
    noSsr: true,
  })
  const dataProvider = useDataProvider()
  const dispatch = useDispatch()

  const playAlbum = React.useCallback(
    (e) => {
      if (e) {
        e.stopPropagation()
        e.preventDefault()
      }
      dataProvider
        .getList('song', {
          pagination: { page: 1, perPage: -1 },
          sort: { field: 'album', order: 'ASC' },
          filter: { album_id: record.id, disc_number: record.discNumber },
        })
        .then((response) => {
          const data = response.data.reduce(
            (acc, cur) => ({ ...acc, [cur.id]: cur }),
            {},
          )
          const ids = response.data.map((r) => r.id)
          dispatch(playTracks(data, ids))
        })
    },
    [dataProvider, dispatch, record],
  )

  if (!record) {
    return null
  }

  const computedClasses = clsx(
    classes.albumContainer,
    record.missing && classes.missingAlbum,
  )

  return (
    <div className={computedClasses}>
      <div className={classes.coverWrapper}>
        <Link
          className={classes.link}
          to={generateAlbumURL(record.id, record.urlAlias, 'show', false)} // Use ID for navigation
        >
          <Cover record={record} />
        </Link>

        {/* Centered play overlay (desktop: appears on hover; mobile: semi-visible) */}
        <div
          className={clsx(
            classes.overlayCenter,
            !isDesktop && classes.overlayCenterMobile,
          )}
        >
          {isDesktop && !record.missing && (
            <PlayButton
              className={classes.albumPlayButton}
              record={record}
              size="large"
            />
          )}
        </div>

        {/* Top-right actions: like and menu */}
        <div className={classes.topRightActions}>
          <IconButton size="small" aria-label="like" color={'#484848'} />
          <AlbumContextMenu record={record} color={'#484848'} />
        </div>

        {/* bottom gradient bar (keeps previous visual) */}
        <div className={isDesktop ? classes.tileBar : classes.tileBarMobile} />
      </div>

      <Link
        className={classes.albumLink}
        to={generateAlbumURL(record.id, record.urlAlias, 'show', false)} // Use ID for navigation
      >
        <span>
          <Typography className={classes.albumName}>{record.name}</Typography>
          {record.tags && record.tags['albumversion'] && (
            <Typography className={classes.albumVersion}>
              {record.tags['albumversion']}
            </Typography>
          )}
        </span>
      </Link>
      {showArtist ? (
        <ArtistLinkField record={record} className={classes.albumSubtitle} />
      ) : (
        <AlbumDatesField record={record} className={classes.albumSubtitle} />
      )}
    </div>
  )
}

const LoadedAlbumGrid = ({ ids, data, basePath, width }) => {
  const classes = useStyles()
  const { filterValues } = useListContext()
  const isArtistView = !!(filterValues && filterValues.artist_id)
  return (
    <div className={classes.root}>
      <ImageList
        component={'div'}
        rowHeight={'auto'}
        cols={getColsForWidth(width)}
        gap={20}
      >
        {ids.map((id) => (
          <ImageListItem className={classes.gridListTile} key={id}>
            <AlbumGridTile
              record={data[id]}
              basePath={basePath}
              showArtist={!isArtistView}
            />
          </ImageListItem>
        ))}
      </ImageList>
    </div>
  )
}

const AlbumGridView = ({ albumListType, loaded, loading, ...props }) => {
  const hide =
    (loading && albumListType === 'random') || !props.data || !props.ids
  return hide ? <Loading /> : <LoadedAlbumGrid {...props} />
}

const AlbumGridViewWithWidth = withWidth()(AlbumGridView)

export default AlbumGridViewWithWidth
