import React, { useEffect, useState } from 'react'
import { Redirect } from 'react-router-dom'
import { useDataProvider, useNotify, Loading } from 'react-admin'
import { useDispatch } from 'react-redux'
import { playTracks } from '../actions'

// PlayRandom is the landing target for the public "▶ Открыть плеер" button.
// It mirrors the header "Play All" (random 500) behaviour: it queues up to 500
// random songs, starts playback immediately, and then redirects to the library.
const PlayRandom = () => {
  const dataProvider = useDataProvider()
  const dispatch = useDispatch()
  const notify = useNotify()
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    dataProvider
      .getList('song', {
        pagination: { page: 1, perPage: 500 },
        sort: { field: 'random', order: 'ASC' },
        filter: { missing: false },
      })
      .then((res) => {
        if (cancelled) return
        const data = {}
        res.data.forEach((song) => {
          data[song.id] = song
        })
        dispatch(playTracks(data))
      })
      .catch(() => {
        if (!cancelled) notify('ra.page.error', 'warning')
      })
      .finally(() => {
        if (!cancelled) setDone(true)
      })
    return () => {
      cancelled = true
    }
  }, [dataProvider, dispatch, notify])

  if (done) {
    return <Redirect to="/" />
  }
  return <Loading />
}

export default PlayRandom
