import React from 'react'
import PropTypes from 'prop-types'
import { useDispatch } from 'react-redux'
import { Button, useTranslate, useUnselectAll, usePermissions } from 'react-admin'
import PlaylistAddIcon from '@material-ui/icons/PlaylistAdd'
import { openAddToPlaylist } from '../actions'

export const AddToPlaylistButton = ({ resource, selectedIds, className }) => {
  const translate = useTranslate()
  const dispatch = useDispatch()
  const unselectAll = useUnselectAll()
  const { permissions } = usePermissions()

  // Hide button for guest users
  if (permissions === 'guest') {
    return null
  }

  const handleClick = () => {
    dispatch(
      openAddToPlaylist({
        selectedIds,
        onSuccess: () => unselectAll(resource),
      }),
    )
  }

  return (
    <Button
      aria-controls="simple-menu"
      aria-haspopup="true"
      onClick={handleClick}
      className={className}
      label={translate('resources.song.actions.addToPlaylist')}
    >
      <PlaylistAddIcon />
    </Button>
  )
}

AddToPlaylistButton.propTypes = {
  resource: PropTypes.string.isRequired,
  selectedIds: PropTypes.arrayOf(PropTypes.string).isRequired,
}
