import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import FiberNewIcon from '@material-ui/icons/FiberNew'
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

const NewMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <MenuItemLink
      ref={ref}
      to="/new"
      primaryText={translate('menu.new.name')}
      leftIcon={<FiberNewIcon />}
      onClick={onClick}
      className={classes.menuItem}
      activeClassName={classes.active}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

NewMenu.displayName = 'NewMenu'

export default NewMenu
