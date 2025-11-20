import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import WhatshotIcon from '@material-ui/icons/Whatshot'
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

const TopMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <MenuItemLink
      ref={ref}
      to="/top"
      primaryText={translate('menu.top.name')}
      leftIcon={<WhatshotIcon />}
      onClick={onClick}
      className={classes.menuItem}
      activeClassName={classes.active}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

TopMenu.displayName = 'TopMenu'

export default TopMenu
