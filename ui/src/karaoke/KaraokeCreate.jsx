import React, { useState } from 'react'
import { useDataProvider, useNotify, Title } from 'react-admin'
import { TextField, Button } from '@material-ui/core'

const KaraokeCreate = (props) => {
  const { onSuccess } = props || {}
  const dataProvider = useDataProvider()
  const notify = useNotify()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [source, setSource] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      const res = await dataProvider.create('karaoke', {
        data: { title, artist, youtubeUrl, source, description },
      })
      notify('Karaoke song added', 'info')
      setTitle('')
      setArtist('')
      setYoutubeUrl('')
      setSource('')
      setDescription('')
      if (onSuccess) onSuccess(res?.data)
    } catch (err) {
      // notify error
      notify('Error adding karaoke', 'warning')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <Title title="Add Karaoke" />
      <h2>Add Karaoke Song</h2>
      <form
        onSubmit={submit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 600,
        }}
      >
        <label>Title</label>
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <label>Artist</label>
        <TextField value={artist} onChange={(e) => setArtist(e.target.value)} />
        <label>YouTube URL</label>
        <TextField
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          required
        />
        <label>Source</label>
        <TextField value={source} onChange={(e) => setSource(e.target.value)} />
        <label>Description</label>
        <TextField
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={3}
        />
        <div>
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={sending}
          >
            Add
          </Button>
        </div>
      </form>
    </div>
  )
}

export default KaraokeCreate
