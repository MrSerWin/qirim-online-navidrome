import React, { useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  makeStyles,
  useMediaQuery,
} from '@material-ui/core'
import ShareIcon from '@material-ui/icons/Share'
import LinkIcon from '@material-ui/icons/Link'
import FileCopyIcon from '@material-ui/icons/FileCopy'
import { useNotify, useTranslate } from 'react-admin'
import {
  FaFacebook,
  FaTwitter,
  FaWhatsapp,
  FaTelegram,
  FaVk,
} from 'react-icons/fa'

const useStyles = makeStyles((theme) => ({
  menuIcon: {
    minWidth: '36px',
  },
  socialIcon: {
    fontSize: '1.2rem',
  },
  shareButton: {
    padding: '3px 8px !important'
  }
}))

/**
 * QuickShareButton - Quick sharing component for albums and artists
 *
 * On mobile: Uses native Web Share API
 * On desktop: Shows menu with copy link and social network options
 */
export const QuickShareButton = ({
  url,
  title,
  description,
  variant = 'text',
  size = 'medium',
  className,
}) => {
  const classes = useStyles()
  const notify = useNotify()
  const translate = useTranslate()
  const [anchorEl, setAnchorEl] = useState(null)
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'))

  // Check if Web Share API is available
  const hasWebShare = typeof navigator !== 'undefined' && navigator.share

  const shareUrl = url || window.location.href
  const shareTitle = title || document.title
  const shareText = description || shareTitle

  const handleClick = (event) => {
    // On mobile with Web Share API support, use native sharing
    if (isMobile && hasWebShare) {
      handleNativeShare()
    } else {
      // On desktop or without Web Share API, show menu
      setAnchorEl(event.currentTarget)
    }
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      })
    } catch (error) {
      if (error.name !== 'AbortError') {
        // eslint-disable-next-line no-console
        console.error('Error sharing:', error)
        notify('ra.message.error', { type: 'warning' })
      }
    }
  }

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
        notify('message.linkCopied', { type: 'info' })
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
          notify('message.linkCopied', { type: 'info' })
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Fallback: Unable to copy', err)
          notify('ra.message.error', { type: 'warning' })
        }
        document.body.removeChild(textArea)
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error copying to clipboard:', error)
      notify('ra.message.error', { type: 'warning' })
    }
    handleClose()
  }

  const handleSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedTitle = encodeURIComponent(shareTitle)
    const encodedText = encodeURIComponent(shareText)

    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      vk: `https://vk.com/share.php?url=${encodedUrl}&title=${encodedTitle}&description=${encodedText}`,
    }

    if (urls[platform]) {
      window.open(urls[platform], '_blank', 'width=600,height=400')
    }
    handleClose()
  }

  const ButtonComponent = variant === 'icon' ? IconButton : Button

  return (
    <>
      <ButtonComponent
        onClick={handleClick}
        label={variant !== 'icon' ? translate('ra.action.share') : undefined}
        aria-label={translate('ra.action.share')}
        className={`${className} ${classes.shareButton}`}
        size={size}
      >
        <ShareIcon />
      </ButtonComponent>

      {/* Menu for desktop */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        keepMounted
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem onClick={handleCopyLink}>
          <ListItemIcon className={classes.menuIcon}>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={translate('message.copyLink')} />
        </MenuItem>

        <MenuItem onClick={() => handleSocialShare('facebook')}>
          <ListItemIcon className={classes.menuIcon}>
            <FaFacebook className={classes.socialIcon} />
          </ListItemIcon>
          <ListItemText primary="Facebook" />
        </MenuItem>

        <MenuItem onClick={() => handleSocialShare('twitter')}>
          <ListItemIcon className={classes.menuIcon}>
            <FaTwitter className={classes.socialIcon} />
          </ListItemIcon>
          <ListItemText primary="Twitter (X)" />
        </MenuItem>

        <MenuItem onClick={() => handleSocialShare('whatsapp')}>
          <ListItemIcon className={classes.menuIcon}>
            <FaWhatsapp className={classes.socialIcon} />
          </ListItemIcon>
          <ListItemText primary="WhatsApp" />
        </MenuItem>

        <MenuItem onClick={() => handleSocialShare('telegram')}>
          <ListItemIcon className={classes.menuIcon}>
            <FaTelegram className={classes.socialIcon} />
          </ListItemIcon>
          <ListItemText primary="Telegram" />
        </MenuItem>

        <MenuItem onClick={() => handleSocialShare('vk')}>
          <ListItemIcon className={classes.menuIcon}>
            <FaVk className={classes.socialIcon} />
          </ListItemIcon>
          <ListItemText primary="VK" />
        </MenuItem>
      </Menu>
    </>
  )
}

QuickShareButton.propTypes = {
  url: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'icon']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
}

export default QuickShareButton
