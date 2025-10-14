import React, { useEffect, useState } from 'react'
import { useDataProvider, Title, usePermissions } from 'react-admin'
import { Button, TextField, Dialog, DialogContent, DialogTitle } from '@material-ui/core'
import KaraokeCreate from './KaraokeCreate'
import { makeStyles } from '@material-ui/core/styles'

const getYouTubeVideoId = (url) => {
  if (!url) return null
  // Extract video ID from various YouTube URL formats
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

const YouTubeThumbnail = ({ url }) => {
  const id = getYouTubeVideoId(url)
  if (!id) return null
  return <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="thumb" style={{ width: 160, height: 90, objectFit: 'cover' }} />
}

const useStyles = makeStyles(
  (theme) => ({
    previewModal: {
      position: 'fixed',
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modal: {
      background: theme.palette.background.default,
      padding: 12,
      borderRadius: 6,
      maxWidth: '90%',
      maxHeight: '90%',
    }
  }))

const KaraokeList = (props) => {
  const classes = useStyles();

  const dataProvider = useDataProvider()
  const { permissions } = usePermissions()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [openCreate, setOpenCreate] = useState(false)

  const load = async (q) => {
    setLoading(true)
    try {
      const filter = q ? { q } : {}
      // use getList - react-admin wants pagination and sort
      const res = await dataProvider.getList('karaoke', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
        filter,
      })
      setItems(res.data)
    } catch (err) {
      // swallow error for now; notify could be added
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    setLoading(true)
    dataProvider
      .getList('karaoke', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
        filter: {},
      })
      .then((res) => {
        if (mounted) setItems(res.data)
      })
      .catch(() => {
        if (mounted) setItems([])
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [dataProvider])

  const onSearch = (e) => {
    e.preventDefault()
    load(query)
  }

  return (
    <div style={{ padding: 16 }}>
      <Title title="Karaoke" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Karaoke</h2>
        <div>
          {permissions === 'admin' && (
            <Button variant="contained" id="add-karaoke-button" color="primary" onClick={() => setOpenCreate(true)}>Add Karaoke</Button>
          )}
        </div>
      </div>
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <TextField label="Search title or artist" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button variant="contained" color="primary" type="submit">Search</Button>
      </form>
      {loading && <div>Loading…</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {items.map((it) => (
          <div key={it.id} style={{ width: 180, border: '1px solid #ddd', borderRadius: 4, padding: 8 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => setSelected(it)}>
              <YouTubeThumbnail url={it.youtubeUrl} />
              <div style={{ fontWeight: 600 }}>{it.title}</div>
              <div style={{ color: '#666' }}>{it.artist}</div>
            </div>
          </div>
        ))}
      </div>

      {selected ? (
        <div className={classes.previewModal} onClick={() => setSelected(null)}>
          <div className={classes.modal} onClick={(e) => e.stopPropagation()}>
            <h3>{selected.title}</h3>
            <p style={{ color: '#666' }}>{selected.artist}</p>
            <div style={{ width: 560, height: 315 }}>
              {getYouTubeVideoId(selected.youtubeUrl) ? (
                <iframe
                  title={selected.title}
                  width="560"
                  height="315"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoId(selected.youtubeUrl)}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div>Invalid YouTube URL</div>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <Button variant="contained" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Karaoke Song</DialogTitle>
        <DialogContent>
          <KaraokeCreate onSuccess={() => { setOpenCreate(false); load(query) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default KaraokeList
