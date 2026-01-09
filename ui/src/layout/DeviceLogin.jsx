import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Typography,
  CircularProgress,
  Button,
  Box,
  makeStyles,
  ThemeProvider,
  createMuiTheme,
} from '@material-ui/core'
import QRCode from 'qrcode'
import { baseUrl } from '../utils'
import LogoWhite from '../icons/qo-logo.png'

// Simple dark theme for standalone use
const darkTheme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#5E81AC',
    },
    background: {
      default: '#202021',
      paper: '#2b2b2b',
    },
    text: {
      primary: '#E5E9F0',
      secondary: '#b3b3b3',
    },
    error: {
      main: '#BF616A',
    },
  },
})

const useStyles = makeStyles((theme) => ({
  main: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.background.default,
  },
  card: {
    padding: theme.spacing(4),
    textAlign: 'center',
    maxWidth: 500,
    width: '90%',
  },
  logo: {
    width: 120,
    marginBottom: theme.spacing(2),
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(3),
  },
  qrCode: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  userCode: {
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '0.3em',
    marginBottom: theme.spacing(2),
    fontFamily: 'monospace',
  },
  instructions: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  error: {
    color: theme.palette.error.main,
    marginTop: theme.spacing(2),
  },
  button: {
    marginTop: theme.spacing(2),
  },
  expiresIn: {
    color: theme.palette.text.secondary,
    fontSize: '0.875rem',
    marginTop: theme.spacing(2),
  },
  backLink: {
    marginTop: theme.spacing(3),
    color: theme.palette.primary.main,
    cursor: 'pointer',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}))

const DeviceLoginContent = () => {
  const classes = useStyles()

  const [loading, setLoading] = useState(true)
  const [deviceCode, setDeviceCode] = useState(null)
  const [userCode, setUserCode] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [status, setStatus] = useState('pending')
  const [error, setError] = useState(null)
  const [expiresIn, setExpiresIn] = useState(0)
  const [pollInterval, setPollInterval] = useState(3)

  const startDeviceAuth = useCallback(async () => {
    setLoading(true)
    setError(null)
    setStatus('pending')

    try {
      const response = await fetch(baseUrl('/auth/device'))
      if (!response.ok) {
        throw new Error('Failed to start device authorization')
      }

      const data = await response.json()
      setDeviceCode(data.device_code)
      setUserCode(data.user_code)
      setExpiresIn(data.expires_in)
      setPollInterval(data.interval)

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(data.qr_data, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
      setQrDataUrl(qrUrl)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const pollStatus = useCallback(async () => {
    if (!deviceCode || status !== 'pending') return

    try {
      const response = await fetch(
        baseUrl(`/auth/device/poll?device_code=${deviceCode}`)
      )
      if (!response.ok) {
        throw new Error('Failed to check status')
      }

      const data = await response.json()
      setStatus(data.status)

      if (data.status === 'granted') {
        // Login successful - save auth data in the same format as authProvider.js
        localStorage.setItem('token', data.token)
        localStorage.setItem('userId', data.id)
        localStorage.setItem('name', data.name)
        localStorage.setItem('username', data.username)
        localStorage.setItem('role', data.isAdmin ? 'admin' : 'regular')
        localStorage.setItem('subsonic-salt', data.subsonicSalt)
        localStorage.setItem('subsonic-token', data.subsonicToken)
        localStorage.setItem('is-authenticated', 'true')
        // Redirect to main app
        window.location.hash = '/'
        window.location.reload()
      } else if (data.status === 'denied') {
        setError('Login was denied')
      } else if (data.status === 'expired') {
        setError('Code expired. Please try again.')
      }
    } catch (err) {
      console.error('Poll error:', err)
    }
  }, [deviceCode, status])

  // Start device auth on mount
  useEffect(() => {
    startDeviceAuth()
  }, [startDeviceAuth])

  // Poll for status
  useEffect(() => {
    if (status !== 'pending' || !deviceCode) return

    const interval = setInterval(pollStatus, pollInterval * 1000)
    return () => clearInterval(interval)
  }, [deviceCode, status, pollInterval, pollStatus])

  // Countdown timer
  useEffect(() => {
    if (expiresIn <= 0) return

    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setStatus('expired')
          setError('Code expired. Please try again.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [expiresIn])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleRetry = () => {
    startDeviceAuth()
  }

  const handleBackToLogin = () => {
    window.location.hash = '/login'
  }

  return (
    <Box className={classes.main}>
      <Card className={classes.card}>
        <img src={LogoWhite} alt="Qirim.Online" className={classes.logo} />

        <Typography variant="h5" className={classes.title}>
          Login with QR Code
        </Typography>

        {loading ? (
          <Box py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <>
            <Typography className={classes.error}>{error}</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleRetry}
              className={classes.button}
            >
              Try Again
            </Button>
          </>
        ) : (
          <>
            <Typography className={classes.instructions}>
              Scan this QR code with your mobile device to log in
            </Typography>

            <Box className={classes.qrContainer}>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className={classes.qrCode}
                />
              )}
            </Box>

            <Typography className={classes.userCode}>{userCode}</Typography>

            <Typography variant="body2" color="textSecondary">
              Or enter this code manually
            </Typography>

            <Box className={classes.status}>
              <CircularProgress size={16} />
              <Typography variant="body2">
                Waiting for confirmation...
              </Typography>
            </Box>

            <Typography className={classes.expiresIn}>
              Code expires in {formatTime(expiresIn)}
            </Typography>
          </>
        )}

        <Typography className={classes.backLink} onClick={handleBackToLogin}>
          Back to login
        </Typography>
      </Card>
    </Box>
  )
}

const DeviceLogin = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <DeviceLoginContent />
    </ThemeProvider>
  )
}

export default DeviceLogin
