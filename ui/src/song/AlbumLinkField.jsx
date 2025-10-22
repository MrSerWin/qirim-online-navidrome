import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-admin'
import { useDispatch } from 'react-redux'
import { closeExtendedInfoDialog } from '../actions'
import { generateAlbumURL } from '../utils/urlGenerator'

export const AlbumLinkField = (props) => {
  const dispatch = useDispatch()

  return (
    <Link
      to={generateAlbumURL(props.record.albumId, props.record.albumAlias, 'show', false)} // Use ID for navigation
      onClick={(e) => {
        e.stopPropagation()
        dispatch(closeExtendedInfoDialog())
      }}
    >
      {props.record.album}
    </Link>
  )
}

AlbumLinkField.propTypes = {
  sortBy: PropTypes.string,
  sortByOrder: PropTypes.oneOf(['ASC', 'DESC']),
}

AlbumLinkField.defaultProps = {
  addLabel: true,
}
