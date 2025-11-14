import React, { forwardRef } from 'react'
import { MenuItemLink } from 'react-admin'
import SecurityIcon from '@material-ui/icons/Security'
import { makeStyles } from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  menuItem: {
    color: theme.palette.text.secondary,
  },
}))

const PrivacyMenu = forwardRef(({ onClick, sidebarIsOpen, dense }, ref) => {
  const classes = useStyles()

  return (
    <MenuItemLink
      ref={ref}
      to="/privacy"
      primaryText="Privacy Policy"
      leftIcon={<SecurityIcon />}
      onClick={onClick}
      className={classes.menuItem}
      sidebarIsOpen={sidebarIsOpen}
      dense={dense}
    />
  )
})

PrivacyMenu.displayName = 'PrivacyMenu'

export default PrivacyMenu
