import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { IconButton, Tooltip } from '@material-ui/core'
import FacebookIcon from '@material-ui/icons/Facebook'
import InstagramIcon from '@material-ui/icons/Instagram'
import { useTranslate } from 'react-admin'

// VK icon (Material-UI doesn't have it, so we create custom SVG)
const VKIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14c5.6 0 6.93-1.33 6.93-6.93V8.93C22 3.33 20.67 2 15.07 2zm3.15 14.1h-1.34c-.56 0-.73-.45-1.73-1.47-1.01-1-1.49-1.13-1.73-1.13-.35 0-.45.1-.45.58v1.34c0 .36-.11.58-1.07.58-1.6 0-3.38-.97-4.63-2.77C5.58 10.23 5.1 8.2 5.1 7.8c0-.24.1-.46.58-.46h1.34c.43 0 .6.2.76.65.87 2.55 2.33 4.78 2.93 4.78.22 0 .32-.1.32-.66V10.1c-.07-1.15-.67-1.25-.67-1.66 0-.2.16-.4.42-.4h2.1c.36 0 .49.19.49.61v3.28c0 .36.16.49.26.49.22 0 .4-.13.82-.54 1.26-1.42 2.17-3.62 2.17-3.62.12-.26.31-.5.78-.5h1.34c.4 0 .49.2.4.6-.15.94-1.8 3.51-1.8 3.51-.18.3-.25.43 0 .77.18.25.77.75 1.17 1.21.73.82 1.3 1.51 1.45 1.99.15.47-.08.71-.54.71z"
    />
  </svg>
)

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(1, 0),
    marginTop: theme.spacing(1),
    gap: theme.spacing(0.5),
  },
  iconButton: {
    color: theme.palette.text.secondary,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      transform: 'scale(1.15)',
      color: theme.palette.primary.main,
    },
  },
  vkButton: {
    '&:hover': {
      color: '#0077FF', // VK brand color
    },
  },
  fbButton: {
    '&:hover': {
      color: '#1877F2', // Facebook brand color
    },
  },
  igButton: {
    '&:hover': {
      // Instagram gradient effect
      background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
  },
}))

const SocialMediaButtons = ({ sidebarIsOpen }) => {
  const classes = useStyles()
  const translate = useTranslate()

  // Social media links - можно вынести в конфигурацию
  const socialLinks = {
    vk: 'https://vk.com/qirim.online',
    facebook: 'https://www.facebook.com/qirimonline',
    instagram: 'https://www.instagram.com/qirim.online/',
  }

  if (!sidebarIsOpen) {
    return null // Hide when sidebar is closed
  }

  return (
    <div className={classes.container}>
      <Tooltip title={translate('menu.social.vk', { _: 'VKontakte' })}>
        <IconButton
          className={`${classes.iconButton} ${classes.vkButton}`}
          size="small"
          href={socialLinks.vk}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="VKontakte"
        >
          <VKIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={translate('menu.social.facebook', { _: 'Facebook' })}>
        <IconButton
          className={`${classes.iconButton} ${classes.fbButton}`}
          size="small"
          href={socialLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
        >
          <FacebookIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={translate('menu.social.instagram', { _: 'Instagram' })}>
        <IconButton
          className={`${classes.iconButton} ${classes.igButton}`}
          size="small"
          href={socialLinks.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <InstagramIcon />
        </IconButton>
      </Tooltip>
    </div>
  )
}

export default SocialMediaButtons
