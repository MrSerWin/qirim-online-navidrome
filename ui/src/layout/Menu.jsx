import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { Divider, makeStyles, Box } from '@material-ui/core'
import clsx from 'clsx'
import { useTranslate, MenuItemLink, getResources, usePermissions } from 'react-admin'
import ViewListIcon from '@material-ui/icons/ViewList'
import AlbumIcon from '@material-ui/icons/Album'
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart'
import SubMenu from './SubMenu'
import { humanize, pluralize } from 'inflection'
import albumLists from '../album/albumLists'
import PlaylistsSubMenu from './PlaylistsSubMenu'
import LibrarySelector from '../common/LibrarySelector'
import PartnersMenu from './PartnersMenu'
import AboutMenu from './AboutMenu'
import PrivacyMenu from './PrivacyMenu'
import TopMenu from './TopMenu'
import NewMenu from './NewMenu'
import WrappedMenu from './WrappedMenu'
import SocialMediaButtons from './SocialMediaButtons'
import config from '../config'

const useStyles = makeStyles((theme) => ({
  root: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    paddingBottom: (props) => (props.addPadding ? '160px' : '140px'), // Extra space for fixed bottom section
    position: 'relative',
  },
  open: {
    width: 240,
  },
  closed: {
    width: 55,
  },
  active: {
    color: theme.palette.text.primary,
    fontWeight: 'bold',
  },
  bottomSection: {
    // position: 'fixed',
    // bottom: 85,
    left: 0,
    width: 240,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  bottomSectionClosed: {
    width: 55,
  },
  smallMenuItem: {
    '& .MuiListItemText-root': {
      '& .MuiTypography-root': {
        fontSize: '0.85rem',
      },
    },
    '& .MuiListItemIcon-root': {
      minWidth: 40,
      '& svg': {
        fontSize: '1.2rem',
      },
    },
  },
}))

const translatedResourceName = (resource, translate) =>
  translate(`resources.${resource.name}.name`, {
    smart_count: 2,
    _:
      resource.options && resource.options.label
        ? translate(resource.options.label, {
            smart_count: 2,
            _: resource.options.label,
          })
        : humanize(pluralize(resource.name)),
  })

const Menu = ({ dense = false }) => {
  const open = useSelector((state) => state.admin.ui.sidebarOpen)
  const translate = useTranslate()
  const queue = useSelector((state) => state.player?.queue)
  const classes = useStyles({ addPadding: queue.length > 0 })
  const resources = useSelector(getResources)
  const { permissions } = usePermissions()

  // TODO State is not persisted in mobile when you close the sidebar menu. Move to redux?
  const [state, setState] = useState({
    menuAlbumList: true,
    menuPlaylists: true,
    menuSharedPlaylists: true,
    menuShop: true,
  })

  const handleToggle = (menu) => {
    setState((state) => ({ ...state, [menu]: !state[menu] }))
  }

  const renderResourceMenuItemLink = (resource) => (
    <MenuItemLink
      key={resource.name}
      to={`/${resource.name}`}
      activeClassName={classes.active}
      primaryText={translatedResourceName(resource, translate)}
      leftIcon={resource.icon || <ViewListIcon />}
      sidebarIsOpen={open}
      dense={dense}
    />
  )

  const renderAlbumMenuItemLink = (type, al) => {
    const resource = resources.find((r) => r.name === 'album')
    if (!resource) {
      return null
    }

    const albumListAddress = `/album/${type}`

    const name = translate(`resources.album.lists.${type || 'default'}`, {
      _: translatedResourceName(resource, translate),
    })

    return (
      <MenuItemLink
        key={albumListAddress}
        to={albumListAddress}
        activeClassName={classes.active}
        primaryText={name}
        leftIcon={al.icon || <ViewListIcon />}
        sidebarIsOpen={open}
        dense={dense}
        exact
      />
    )
  }

  const subItems = (subMenu) => (resource) =>
    resource.hasList && resource.options && resource.options.subMenu === subMenu

  return (
    <div
      className={clsx(classes.root, {
        [classes.open]: open,
        [classes.closed]: !open,
      })}
    >
      {open && <LibrarySelector />}
      {/* Albums - direct link to random albums (no submenu) */}
      <MenuItemLink
        to="/album/random"
        activeClassName={classes.active}
        primaryText={translate('resources.album.name', { smart_count: 2 })}
        leftIcon={<AlbumIcon />}
        sidebarIsOpen={open}
        dense={dense}
      />
      {/* Commented out - old submenu with multiple album views
      <SubMenu
        handleToggle={() => handleToggle('menuAlbumList')}
        isOpen={state.menuAlbumList}
        sidebarIsOpen={open}
        name="menu.albumList"
        icon={<AlbumIcon />}
        dense={dense}
      >
        {Object.keys(albumLists).map((type) =>
          renderAlbumMenuItemLink(type, albumLists[type]),
        )}
      </SubMenu>
      */}

      {/* Top and New tracks */}
      <TopMenu sidebarIsOpen={open} dense={dense} />
      <NewMenu sidebarIsOpen={open} dense={dense} />
      {/* Hide Wrapped menu for guest users */}
      {permissions !== 'guest' && (
        <WrappedMenu sidebarIsOpen={open} dense={dense} />
      )}

      {resources.filter(subItems(undefined)).map(renderResourceMenuItemLink)}
      {config.devSidebarPlaylists && open ? (
        <>
          <Divider />
          <PlaylistsSubMenu
            state={state}
            setState={setState}
            sidebarIsOpen={open}
            dense={dense}
          />
        </>
      ) : (
        resources.filter(subItems('playlist')).map(renderResourceMenuItemLink)
      )}

      <Divider />
      <PartnersMenu sidebarIsOpen={open} dense={dense} />
      <SocialMediaButtons sidebarIsOpen={open} />

      {/* Bottom section with Privacy and About - fixed at bottom */}
      <Box
        className={clsx(classes.bottomSection, {
          [classes.bottomSectionClosed]: !open,
        })}
      >
        <Divider />
        <Box className={classes.smallMenuItem}>
          <AboutMenu sidebarIsOpen={open} dense={dense} />
        </Box>
        <Box className={classes.smallMenuItem}>
          <PrivacyMenu sidebarIsOpen={open} dense={dense} />
        </Box>
      </Box>

      {config.enableShop && resources.filter(subItems('shop')).length > 0 && (
        <>
          <Divider />
          <SubMenu
            handleToggle={() => handleToggle('menuShop')}
            isOpen={state.menuShop}
            sidebarIsOpen={open}
            name="menu.shop"
            icon={<ShoppingCartIcon />}
            dense={dense}
          >
            {resources.filter(subItems('shop')).map(renderResourceMenuItemLink)}
          </SubMenu>
        </>
      )}
    </div>
  )
}

export default Menu
