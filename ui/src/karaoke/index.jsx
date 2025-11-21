import React from 'react'
import KaraokeList from './KaraokeList'
import KaraokeCreate from './KaraokeCreate'
import DynamicMenuIcon from '../layout/DynamicMenuIcon'
import QueueMusicOutlinedIcon from '@material-ui/icons/QueueMusicOutlined'
import QueueMusicIcon from '@material-ui/icons/QueueMusic'

// Configuration for admin users - has access to create
const admin = {
  list: KaraokeList,
  create: KaraokeCreate,
  icon: (
    <DynamicMenuIcon
      path={'karaoke'}
      icon={QueueMusicOutlinedIcon}
      activeIcon={QueueMusicIcon}
    />
  ),
}

// Configuration for regular users - no create access
const all = {
  list: KaraokeList,
  icon: (
    <DynamicMenuIcon
      path={'karaoke'}
      icon={QueueMusicOutlinedIcon}
      activeIcon={QueueMusicIcon}
    />
  ),
}

export default {
  admin,
  all,
}
