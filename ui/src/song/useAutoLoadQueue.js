import { useEffect, useRef, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useDataProvider, useListContext } from 'react-admin'
import { addTracks } from '../actions'

/**
 * Hook to automatically load next page of songs when queue is near end
 */
export const useAutoLoadQueue = ({ resource = 'song', threshold = 10 }) => {
  const dispatch = useDispatch()
  const dataProvider = useDataProvider()
  const listContext = useListContext()

  const filterValues = listContext.filterValues || {}
  const sort = listContext.sort || { field: 'title', order: 'ASC' }
  const perPage = listContext.perPage || 50

  const playerState = useSelector((state) => state.player)
  const loadingRef = useRef(false)
  const currentPageRef = useRef(1)

  const { queue, current } = playerState

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current) {
      return
    }

    loadingRef.current = true
    const nextPage = currentPageRef.current + 1

    try {
      console.log(`[AutoLoadQueue] Loading page ${nextPage}`)

      const { data: newData, total } = await dataProvider.getList(resource, {
        pagination: { page: nextPage, perPage },
        sort,
        filter: filterValues,
      })

      if (newData && newData.length > 0) {
        // Convert array to object {id: record}
        const dataObject = newData.reduce((acc, item) => {
          acc[item.id] = item
          return acc
        }, {})

        const ids = newData.map(item => item.id)

        console.log(`[AutoLoadQueue] Adding ${ids.length} tracks to queue`)
        dispatch(addTracks(dataObject, ids))
        currentPageRef.current = nextPage

        console.log(`[AutoLoadQueue] Loaded ${newData.length} tracks from page ${nextPage}. Total: ${total}`)
      } else {
        console.log('[AutoLoadQueue] No more tracks to load')
      }
    } catch (error) {
      console.error('[AutoLoadQueue] Error loading next page:', error)
    } finally {
      loadingRef.current = false
    }
  }, [dataProvider, resource, perPage, sort, filterValues, dispatch])

  useEffect(() => {
    if (!queue || queue.length === 0 || !current) {
      return
    }

    // Find current track index in queue
    const currentIndex = queue.findIndex(track => track.uuid === current.uuid)

    if (currentIndex === -1) {
      return
    }

    const tracksRemaining = queue.length - currentIndex

    console.log(`[AutoLoadQueue] Current: ${currentIndex + 1}/${queue.length}, Remaining: ${tracksRemaining}`)

    // If we're near the end, load more
    if (tracksRemaining <= threshold && !loadingRef.current) {
      console.log(`[AutoLoadQueue] Near end (${tracksRemaining} tracks left), loading next page...`)
      loadNextPage()
    }
  }, [current, queue, threshold, loadNextPage])

  // Reset page counter when filters change
  useEffect(() => {
    currentPageRef.current = 1
    loadingRef.current = false
  }, [filterValues, sort])
}
