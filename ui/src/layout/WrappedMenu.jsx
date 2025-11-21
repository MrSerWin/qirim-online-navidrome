import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import TimelineIcon from '@material-ui/icons/Timeline'
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

const WrappedMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <MenuItemLink
      ref={ref}
      to="/wrapped"
      primaryText={translate('menu.wrapped.name')}
      leftIcon={<TimelineIcon />}
      onClick={onClick}
      className={classes.menuItem}
      activeClassName={classes.active}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

WrappedMenu.displayName = 'WrappedMenu'

export default WrappedMenu
