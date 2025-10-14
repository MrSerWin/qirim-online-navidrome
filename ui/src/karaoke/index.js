import KaraokeList from './KaraokeList'
import KaraokeCreate from './KaraokeCreate'

// Configuration for admin users - has access to create
const admin = {
  list: KaraokeList,
  create: KaraokeCreate,
}

// Configuration for regular users - no create access
const all = {
  list: KaraokeList,
}

export default {
  admin,
  all,
}
