import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import PeopleOutlineIcon from '@material-ui/icons/PeopleOutline'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  menuItem: {
    color: theme.palette.text.secondary,
  },
}))

const PartnersMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <MenuItemLink
      ref={ref}
      to="/partners"
      primaryText={translate('menu.partners.name')}
      leftIcon={<PeopleOutlineIcon />}
      onClick={onClick}
      className={classes.menuItem}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

PartnersMenu.displayName = 'PartnersMenu'

export default PartnersMenu
