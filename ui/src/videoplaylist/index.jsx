import React from 'react'
import VideoPlaylistList from './VideoPlaylistList'
import VideoPlaylistShow from './VideoPlaylistShow'
import DynamicMenuIcon from '../layout/DynamicMenuIcon'
import PlaylistPlayOutlinedIcon from '@material-ui/icons/PlaylistPlayOutlined'
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay'

// Configuration for admin users
// Note: list removed to hide from menu, but show still works via direct link
const admin = {
  list: VideoPlaylistList,
  show: VideoPlaylistShow,
  options: { subMenu: 'hidden' },
}

// Configuration for regular users (same as admin for now - read only)
// Note: list removed to hide from menu, but show still works via direct link
const all = {
  list: VideoPlaylistList,
  show: VideoPlaylistShow,
  options: { subMenu: 'hidden' },
}

export default {
  admin,
  all,
}
