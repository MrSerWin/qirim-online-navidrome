import React, { useState, useEffect } from 'react'
import { Box, Container, Typography, CircularProgress, Button } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { TranslationProvider, useTranslate } from 'react-admin'
import polyglotI18nProvider from 'ra-i18n-polyglot'
import HomeIcon from '@material-ui/icons/Home'
import WrappedSlides from './WrappedSlides'
import enTranslations from '../i18n/en.json'
import ruTranslations from '../i18n/ru.json'

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: theme.spacing(4),
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    color: 'white',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80vh',
    color: 'white',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: theme.spacing(2),
  },
  errorMessage: {
    fontSize: '1.2rem',
    opacity: 0.9,
  },
  homeButton: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(2, 4),
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: theme.spacing(3),
    textTransform: 'none',
    boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(245, 87, 108, 0.6)',
      background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
    },
  },
  buttonContainer: {
    textAlign: 'center',
    marginTop: theme.spacing(3),
  },
}))

// Create i18n provider for public page (outside react-admin)
const getTranslations = () => {
  const locale = localStorage.getItem('locale') || 'ru'

  // For bundled languages (en, ru)
  if (locale === 'en') return enTranslations
  if (locale === 'ru') return ruTranslations

  // For other languages (uk, tr, crh), try to load from localStorage
  const cached = JSON.parse(localStorage.getItem('translation'))
  if (cached && cached.id === locale) {
    try {
      return JSON.parse(cached.data)
    } catch (e) {
      console.error('Failed to parse cached translation:', e)
    }
  }

  // Fallback to Russian
  return ruTranslations
}

const locale = localStorage.getItem('locale') || 'ru'
const i18nProvider = polyglotI18nProvider(() => getTranslations(), locale)

const HomeButton = () => {
  const classes = useStyles()
  const translate = useTranslate()

  const handleGoHome = () => {
    window.location.href = '/'
  }

  return (
    <Box className={classes.buttonContainer}>
      <Button
        className={classes.homeButton}
        onClick={handleGoHome}
        startIcon={<HomeIcon />}
        size="large"
      >
        {translate('wrapped.goToHome')}
      </Button>
    </Box>
  )
}

const WrappedPublicShare = () => {
  const classes = useStyles()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSharedWrapped = async () => {
      try {
        // Extract shareId from hash: #/wrapped/share/{shareId}
        const hash = window.location.hash
        const match = hash.match(/^#\/wrapped\/share\/([a-f0-9-]+)$/i)

        if (!match) {
          throw new Error('Invalid share URL')
        }

        const shareId = match[1]
        const response = await fetch(`/api/wrapped/share/${shareId}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Share not found or expired')
          }
          throw new Error('Failed to load shared Wrapped')
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error('Error fetching shared wrapped:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSharedWrapped()
  }, [])

  if (loading) {
    return (
      <TranslationProvider i18nProvider={i18nProvider}>
        <Box className={classes.root}>
          <Box className={classes.loadingContainer}>
            <CircularProgress size={60} style={{ color: 'white' }} />
            <Typography variant="h5" style={{ marginTop: 24 }}>
              Loading Wrapped...
            </Typography>
          </Box>
        </Box>
      </TranslationProvider>
    )
  }

  if (error) {
    return (
      <TranslationProvider i18nProvider={i18nProvider}>
        <Box className={classes.root}>
          <Box className={classes.errorContainer}>
            <Typography className={classes.errorTitle}>
              😕 Oops!
            </Typography>
            <Typography className={classes.errorMessage}>
              {error}
            </Typography>
          </Box>
        </Box>
      </TranslationProvider>
    )
  }

  if (!data) {
    return (
      <TranslationProvider i18nProvider={i18nProvider}>
        <Box className={classes.root}>
          <Box className={classes.errorContainer}>
            <Typography className={classes.errorTitle}>
              No data available
            </Typography>
          </Box>
        </Box>
      </TranslationProvider>
    )
  }

  return (
    <TranslationProvider i18nProvider={i18nProvider}>
      <Box className={classes.root}>
        <Container maxWidth="md">
          <WrappedSlides data={data} year={data.year} showShareButton={false} />
          <HomeButton />
        </Container>
      </Box>
    </TranslationProvider>
  )
}

export default WrappedPublicShare
