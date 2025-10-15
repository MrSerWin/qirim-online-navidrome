import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Button from '@material-ui/core/Button'
import { useTranslate } from 'react-admin'
import config from '../config'
import { baseUrl } from '../utils'

const useStyles = makeStyles((theme) => ({
  oauthContainer: {
    padding: '1em',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5em',
  },
  oauthDivider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '1em 0',
    '&::before, &::after': {
      content: '""',
      flex: 1,
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '&::before': {
      marginRight: '0.5em',
    },
    '&::after': {
      marginLeft: '0.5em',
    },
  },
  oauthButton: {
    textTransform: 'none',
    justifyContent: 'flex-start',
    padding: '10px 16px',
    '& .icon': {
      marginRight: '12px',
      width: '20px',
      height: '20px',
    },
  },
  googleButton: {
    backgroundColor: '#4285f4',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#357ae8',
    },
  },
  appleButton: {
    backgroundColor: '#000',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#333',
    },
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    color: '#fff',
    '&:hover': {
      backgroundColor: '#166fe5',
    },
  },
  instagramButton: {
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    color: '#fff',
    '&:hover': {
      background: 'linear-gradient(45deg, #d97d24 0%, #c9562d 25%, #c31934 50%, #b31457 75%, #a10779 100%)',
    },
  },
}))

const OAuthButtons = () => {
  const classes = useStyles()
  const translate = useTranslate()

  if (!config.enableOAuth) {
    return null
  }

  const providers = config.oauthProviders || {}
  const enabledProviders = Object.entries(providers).filter(([_, enabled]) => enabled)

  if (enabledProviders.length === 0) {
    return null
  }

  const handleOAuthLogin = (provider) => {
    window.location.href = baseUrl(`/auth/oauth/${provider}`)
  }

  const providerConfig = {
    google: {
      label: 'Google',
      className: classes.googleButton,
      icon: (
        <svg className="icon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
    },
    apple: {
      label: 'Apple',
      className: classes.appleButton,
      icon: (
        <svg className="icon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
          />
        </svg>
      ),
    },
    facebook: {
      label: 'Facebook',
      className: classes.facebookButton,
      icon: (
        <svg className="icon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
          />
        </svg>
      ),
    },
    instagram: {
      label: 'Instagram',
      className: classes.instagramButton,
      icon: (
        <svg className="icon" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
          />
        </svg>
      ),
    },
  }

  return (
    <>
      <div className={classes.oauthDivider}>
        <span>{translate('ra.auth.or')}</span>
      </div>
      <div className={classes.oauthContainer}>
        {enabledProviders.map(([provider]) => {
          const cfg = providerConfig[provider]
          if (!cfg) return null

          return (
            <Button
              key={provider}
              variant="contained"
              fullWidth
              className={`${classes.oauthButton} ${cfg.className}`}
              onClick={() => handleOAuthLogin(provider)}
            >
              {cfg.icon}
              {translate('ra.auth.signInWith', { provider: cfg.label })}
            </Button>
          )
        })}
      </div>
    </>
  )
}

export default OAuthButtons
