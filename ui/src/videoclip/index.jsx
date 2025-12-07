import React from 'react'
import VideoClipList from './VideoClipList'
import VideoClipShow from './VideoClipShow'
import DynamicMenuIcon from '../layout/DynamicMenuIcon'
import VideoLibraryOutlinedIcon from '@material-ui/icons/VideoLibraryOutlined'
import VideoLibraryIcon from '@material-ui/icons/VideoLibrary'

// Configuration for admin users
const admin = {
  list: VideoClipList,
  show: VideoClipShow,
  icon: (
    <DynamicMenuIcon
      path={'video-clip'}
      icon={VideoLibraryOutlinedIcon}
      activeIcon={VideoLibraryIcon}
    />
  ),
}

// Configuration for regular users (same as admin for now - read only)
const all = {
  list: VideoClipList,
  show: VideoClipShow,
  icon: (
    <DynamicMenuIcon
      path={'video-clip'}
      icon={VideoLibraryOutlinedIcon}
      activeIcon={VideoLibraryIcon}
    />
  ),
}

export default {
  admin,
  all,
}
