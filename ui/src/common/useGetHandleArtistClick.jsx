import { useAlbumsPerPage } from './useAlbumsPerPage'
import config from '../config.js'
import { generateArtistURL } from '../utils/urlGenerator'

export const useGetHandleArtistClick = (width) => {
  const [perPage] = useAlbumsPerPage(width)
  return (id, alias) => {
    if (config.devShowArtistPage && id !== config.variousArtistsId) {
      // Use ID for navigation, not alias
      return generateArtistURL(id, alias, 'show', false)
    } else {
      return `/album?filter={"artist_id":"${id}"}&order=ASC&sort=max_year&displayedFilters={"compilation":true}&perPage=${perPage}`
    }
  }
}
