import React, { forwardRef } from 'react'
import { MenuItemLink, useTranslate } from 'react-admin'
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  menuItem: {
    color: theme.palette.text.secondary,
  },
}))

const AboutMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <MenuItemLink
      ref={ref}
      to="/about"
      primaryText={translate('menu.about.name')}
      leftIcon={<InfoOutlinedIcon />}
      onClick={onClick}
      className={classes.menuItem}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

AboutMenu.displayName = 'AboutMenu'

export default AboutMenu
