import React, { useState } from 'react'
import {
  ImageList,
  ImageListItem,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  TextField,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import withWidth from '@material-ui/core/withWidth'
import {
  useListContext,
  Loading,
  useDataProvider,
  useNotify,
  useRefresh,
  usePermissions,
} from 'react-admin'

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
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  )
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
  const [isEditing, setIsEditing] = useState(false)
  const dataProvider = useDataProvider()
  const notify = useNotify()
  const refresh = useRefresh()
  const { permissions } = usePermissions() || {}
  const isAdmin = permissions === 'admin'
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState(record?.title || '')
  const [editArtist, setEditArtist] = useState(record?.artist || '')
  const [editYoutubeUrl, setEditYoutubeUrl] = useState(record?.youtubeUrl || '')
  const [editSource, setEditSource] = useState(record?.source || '')
  const [editDescription, setEditDescription] = useState(record?.description || '')

  if (!record) {
    return null
  }

  const videoId = getYouTubeVideoId(record.youtubeUrl)

  const handleEdit = () => {
    setEditTitle(record.title || '')
    setEditArtist(record.artist || '')
    setEditYoutubeUrl(record.youtubeUrl || '')
    setEditSource(record.source || '')
    setEditDescription(record.description || '')
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    try {
      setSaving(true)
      await dataProvider.update('karaoke', {
        id: record.id,
        data: {
          title: editTitle,
          artist: editArtist,
          youtubeUrl: editYoutubeUrl,
          source: editSource,
          description: editDescription,
        },
        previousData: record,
      })
      notify('Запись обновлена', { type: 'info' })
      refresh()
      setIsEditing(false)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Update karaoke error', err)
      notify('Ошибка при обновлении', { type: 'warning' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  return (
    <>
      <div className={classes.itemContainer} onClick={() => setOpen(true)}>
        <YouTubeThumbnail
          url={record.youtubeUrl}
          className={classes.thumbnail}
        />
        <Typography className={classes.title}>{record.title}</Typography>
        <Typography className={classes.artist}>{record.artist}</Typography>
      </div>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false)
          setIsEditing(false)
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{isEditing ? 'Редактировать караоке' : record.title}</DialogTitle>
        <DialogContent>
          {isEditing ? (
            // Edit form
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Typography variant="body2" style={{ marginBottom: 4 }}>
                  Title *
                </Typography>
                <TextField
                  fullWidth
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                />
              </div>

              <div>
                <Typography variant="body2" style={{ marginBottom: 4 }}>
                  Artist
                </Typography>
                <TextField
                  fullWidth
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  variant="outlined"
                  size="small"
                />
              </div>

              <div>
                <Typography variant="body2" style={{ marginBottom: 4 }}>
                  YouTube URL *
                </Typography>
                <TextField
                  fullWidth
                  value={editYoutubeUrl}
                  onChange={(e) => setEditYoutubeUrl(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                />
              </div>

              <div>
                <Typography variant="body2" style={{ marginBottom: 4 }}>
                  Source
                </Typography>
                <TextField
                  fullWidth
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  variant="outlined"
                  size="small"
                />
              </div>

              <div>
                <Typography variant="body2" style={{ marginBottom: 4 }}>
                  Description
                </Typography>
                <TextField
                  fullWidth
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  multiline
                  rows={4}
                  variant="outlined"
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Отмена
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveEdit}
                  disabled={saving || !editTitle || !editYoutubeUrl}
                >
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          ) : (
            // View mode
            <>
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                {record.artist}
              </Typography>

              <div className={classes.videoContainer} style={{ marginTop: 16 }}>
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

              {record.source && (
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Source:</strong> {record.source}
                </Typography>
              )}

              {record.description && (
                <div>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                    style={{ marginTop: 8 }}
                  >
                    <strong>Description:</strong>
                  </Typography>
                  <span style={{ whiteSpace: 'pre-wrap' }}>
                    {record.description}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {isAdmin && (
                  <>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleEdit}
                      style={{ marginTop: 16 }}
                    >
                      Редактировать
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={async () => {
                        if (!window.confirm('Удалить запись?')) return
                        try {
                          setDeleting(true)
                          await dataProvider.delete('karaoke', { id: record.id })
                          notify('Запись удалена', { type: 'info' })
                          refresh()
                          setOpen(false)
                        } catch (err) {
                          // eslint-disable-next-line no-console
                          console.error('Delete karaoke error', err)
                          notify('Ошибка при удалении', { type: 'warning' })
                        } finally {
                          setDeleting(false)
                        }
                      }}
                      disabled={deleting}
                      style={{ marginTop: 16 }}
                    >
                      Удалить
                    </Button>
                  </>
                )}

                <Button
                  variant="contained"
                  onClick={() => setOpen(false)}
                  style={{ marginTop: 16 }}
                >
                  Close
                </Button>
              </div>
            </>
          )}
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
