import React from 'react'
import SongList from './SongList'
import SongShow from './SongShow'
import MusicNoteOutlinedIcon from '@material-ui/icons/MusicNoteOutlined'
import MusicNoteIcon from '@material-ui/icons/MusicNote'
import DynamicMenuIcon from '../layout/DynamicMenuIcon'

export default {
  list: SongList,
  show: SongShow,
  icon: (
    <DynamicMenuIcon
      path={'song'}
      icon={MusicNoteOutlinedIcon}
      activeIcon={MusicNoteIcon}
    />
  ),
}
