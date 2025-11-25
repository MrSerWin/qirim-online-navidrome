import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import { Subject as LyricsIcon } from '@material-ui/icons'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  menuItem: {
    color: theme.palette.text.secondary,
  },
  active: {
    color: theme.palette.text.primary,
    fontWeight: 'bold',
  },
}))

const LyricsModerationMenu = forwardRef(
  ({ onClick, sidebarIsOpen, dense }, ref) => {
    const classes = useStyles()
    const translate = useTranslate()

    return (
      <MenuItemLink
        ref={ref}
        to="/lyrics-moderation"
        primaryText={translate('menu.lyricsModeration.name')}
        leftIcon={<LyricsIcon />}
        onClick={onClick}
        className={classes.menuItem}
        activeClassName={classes.active}
        sidebarIsOpen={sidebarIsOpen}
        dense={dense}
      />
    )
  },
)

LyricsModerationMenu.displayName = 'LyricsModerationMenu'

export default LyricsModerationMenu
