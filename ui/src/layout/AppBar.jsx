import React, { createElement, forwardRef, Fragment, useCallback } from 'react'
import {
  AppBar as RAAppBar,
  MenuItemLink,
  useTranslate,
  usePermissions,
  getResources,
  useDataProvider,
  useNotify,
} from 'react-admin'
import { MdInfo, MdPerson, MdSupervisorAccount } from 'react-icons/md'
import { useSelector, useDispatch } from 'react-redux'
import { makeStyles, MenuItem, ListItemIcon, Divider, IconButton, Tooltip, Box } from '@material-ui/core'
import ViewListIcon from '@material-ui/icons/ViewList'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import { Dialogs } from '../dialogs/Dialogs'
import { AboutDialog } from '../dialogs'
import PersonalMenu from './PersonalMenu'
import ActivityPanel from './ActivityPanel'
import NowPlayingPanel from './NowPlayingPanel'
import UserMenu from './UserMenu'
import { playTracks } from '../actions'
import config from '../config'

const useStyles = makeStyles(
  (theme) => ({
    root: {
      color: theme.palette.text.secondary,
    },
    active: {
      color: theme.palette.text.primary,
    },
    icon: { minWidth: theme.spacing(5) },
    playButton: {
      marginRight: theme.spacing(1),
      color: theme.palette.primary.main,
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  }),
  {
    name: 'NDAppBar',
  },
)

const AboutMenuItem = forwardRef(({ onClick, ...rest }, ref) => {
  const classes = useStyles(rest)
  const translate = useTranslate()
  const [open, setOpen] = React.useState(false)

  const handleOpen = () => {
    setOpen(true)
  }
  const handleClose = () => {
    onClick && onClick()
    setOpen(false)
  }
  const label = translate('menu.about')
  return (
    <>
      <MenuItem ref={ref} onClick={handleOpen} className={classes.root}>
        <ListItemIcon className={classes.icon}>
          <MdInfo title={label} size={24} />
        </ListItemIcon>
        {label}
      </MenuItem>
      <AboutDialog onClose={handleClose} open={open} />
    </>
  )
})

AboutMenuItem.displayName = 'AboutMenuItem'

const settingsResources = (resource) =>
  resource.name !== 'user' &&
  resource.hasList &&
  resource.options &&
  resource.options.subMenu === 'settings'

const GuestUserMenu = () => {
  const translate = useTranslate()
  const classes = useStyles()

  return (
    <>
      <ShufflePlayButton />
      <MenuItem
        className={classes.root}
        onClick={() => {
          window.location.hash = '#/login'
        }}
      >
        <ListItemIcon className={classes.icon}>
          <MdPerson size={24} />
        </ListItemIcon>
        {translate('ra.auth.sign_in', { _: 'Sign In' })}
      </MenuItem>
    </>
  )
}

const CustomUserMenu = ({ onClick, ...rest }) => {
  const translate = useTranslate()
  const resources = useSelector(getResources)
  const classes = useStyles(rest)
  const { permissions } = usePermissions()

  // Show simple sign-in button for guest users
  if (permissions === 'guest') {
    return <GuestUserMenu />
  }

  const resourceDefinition = (resourceName) =>
    resources.find((r) => r?.name === resourceName)

  const renderUserMenuItemLink = () => {
    const userResource = resourceDefinition('user')
    if (!userResource) {
      return null
    }
    if (permissions !== 'admin') {
      if (!config.enableUserEditing) {
        return null
      }
      userResource.icon = MdPerson
    } else {
      userResource.icon = MdSupervisorAccount
    }
    return renderSettingsMenuItemLink(
      userResource,
      permissions !== 'admin' ? localStorage.getItem('userId') : null,
    )
  }

  const renderSettingsMenuItemLink = (resource, id) => {
    const label = translate(`resources.${resource.name}.name`, {
      smart_count: id ? 1 : 2,
    })
    const link = id ? `/${resource.name}/${id}` : `/${resource.name}`
    return (
      <MenuItemLink
        className={classes.root}
        activeClassName={classes.active}
        key={resource.name}
        to={link}
        primaryText={label}
        leftIcon={
          (resource.icon && createElement(resource.icon, { size: 24 })) || (
            <ViewListIcon />
          )
        }
        onClick={onClick}
        sidebarIsOpen={true}
      />
    )
  }

  return (
    <>
      <ShufflePlayButton />
      {config.devActivityPanel &&
        permissions === 'admin' &&
        config.enableNowPlaying && <NowPlayingPanel />}
      {config.devActivityPanel && permissions === 'admin' && <ActivityPanel />}
      <UserMenu {...rest}>
        <PersonalMenu sidebarIsOpen={true} onClick={onClick} />
        <Divider />
        {renderUserMenuItemLink()}
        {resources
          .filter(settingsResources)
          .map((r) => renderSettingsMenuItemLink(r))}
        <Divider />
        <AboutMenuItem />
      </UserMenu>
      <Dialogs />
    </>
  )
}

const ShufflePlayButton = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const dataProvider = useDataProvider()
  const dispatch = useDispatch()
  const notify = useNotify()

  const handlePlayClick = useCallback(() => {
    dataProvider
      .getList('song', {
        pagination: { page: 1, perPage: 500 },
        sort: { field: 'random', order: 'ASC' },
        filter: { missing: false },
      })
      .then((res) => {
        const data = {}
        res.data.forEach((song) => {
          data[song.id] = song
        })
        dispatch(playTracks(data))
      })
      .catch(() => {
        notify('ra.page.error', 'warning')
      })
  }, [dataProvider, dispatch, notify])

  return (
    <Tooltip title={translate('resources.song.actions.playNow', { _: 'Play All' })}>
      <IconButton
        className={classes.playButton}
        onClick={handlePlayClick}
        aria-label={translate('resources.song.actions.playNow', { _: 'Play All' })}
        size="medium"
      >
        <PlayArrowIcon fontSize="large" />
      </IconButton>
    </Tooltip>
  )
}

const AppBar = (props) => (
  <RAAppBar {...props} container={Fragment} userMenu={<CustomUserMenu />} />
)

export default AppBar
