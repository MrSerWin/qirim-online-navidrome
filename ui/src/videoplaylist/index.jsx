import React from 'react'
import VideoPlaylistList from './VideoPlaylistList'
import VideoPlaylistShow from './VideoPlaylistShow'
import DynamicMenuIcon from '../layout/DynamicMenuIcon'
import PlaylistPlayOutlinedIcon from '@material-ui/icons/PlaylistPlayOutlined'
import PlaylistPlayIcon from '@material-ui/icons/PlaylistPlay'

// Configuration for admin users
const admin = {
  list: VideoPlaylistList,
  show: VideoPlaylistShow,
  icon: (
    <DynamicMenuIcon
      path={'video-playlist'}
      icon={PlaylistPlayOutlinedIcon}
      activeIcon={PlaylistPlayIcon}
    />
  ),
}

// Configuration for regular users (same as admin for now - read only)
const all = {
  list: VideoPlaylistList,
  show: VideoPlaylistShow,
  icon: (
    <DynamicMenuIcon
      path={'video-playlist'}
      icon={PlaylistPlayOutlinedIcon}
      activeIcon={PlaylistPlayIcon}
    />
  ),
}

export default {
  admin,
  all,
}
