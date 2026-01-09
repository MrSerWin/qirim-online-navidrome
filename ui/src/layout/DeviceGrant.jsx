import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Typography,
  CircularProgress,
  Button,
  Box,
  makeStyles,
} from '@material-ui/core'
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline'
import CancelOutlinedIcon from '@material-ui/icons/CancelOutlined'
import ComputerIcon from '@material-ui/icons/Computer'
import { useTranslate, useNotify } from 'react-admin'
import { useLocation } from 'react-router-dom'
import { baseUrl } from '../utils'

// Check if user is authenticated by looking at localStorage
const isAuthenticated = () => {
  return localStorage.getItem('is-authenticated') === 'true' && localStorage.getItem('token')
}

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 500,
    margin: '0 auto',
  },
  card: {
    padding: theme.spacing(4),
    textAlign: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
  },
  deviceInfo: {
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    textAlign: 'left',
  },
  deviceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    '&:last-child': {
      marginBottom: 0,
    },
  },
  deviceLabel: {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  deviceValue: {
    color: theme.palette.text.primary,
    maxWidth: '60%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userCode: {
    fontSize: '1.5rem',
    fontWeight: 700,
    letterSpacing: '0.2em',
    fontFamily: 'monospace',
    marginBottom: theme.spacing(3),
  },
  buttonContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    justifyContent: 'center',
  },
  grantButton: {
    minWidth: 140,
  },
  denyButton: {
    minWidth: 140,
  },
  successIcon: {
    fontSize: 80,
    color: theme.palette.success.main,
    marginBottom: theme.spacing(2),
  },
  errorIcon: {
    fontSize: 80,
    color: theme.palette.error.main,
    marginBottom: theme.spacing(2),
  },
  message: {
    marginTop: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: theme.spacing(4),
  },
}))

const DeviceGrant = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const notify = useNotify()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [result, setResult] = useState(null) // 'granted', 'denied', 'error', 'expired'
  const [error, setError] = useState(null)
  const [authenticated, setAuthenticated] = useState(isAuthenticated())

  // Get code from URL query params
  const searchParams = new URLSearchParams(location.search)
  const userCode = searchParams.get('code')

  // Check if user is authenticated, redirect to login if not
  useEffect(() => {
    if (!isAuthenticated()) {
      // Save current URL to redirect back after login
      // Use hash-based URL for the return path
      const returnPath = `/device/grant${location.search}`
      // Redirect to login with the return URL encoded in the hash
      window.location.hash = `/login`
      // Store the return URL in sessionStorage to use after login
      sessionStorage.setItem('deviceGrantReturnUrl', returnPath)
    } else {
      setAuthenticated(true)
    }
  }, [location.search])

  const loadDeviceInfo = useCallback(async () => {
    if (!userCode) {
      setError(translate('ra.auth.deviceCodeMissing', { _: 'No device code provided' }))
      setLoading(false)
      return
    }

    try {
      const response = await fetch(baseUrl(`/auth/device/info?code=${userCode}`))
      if (!response.ok) {
        throw new Error('Failed to load device info')
      }

      const data = await response.json()

      if (!data.valid) {
        setResult(data.reason)
        setError(data.message)
      } else {
        setDeviceInfo(data)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userCode, translate])

  useEffect(() => {
    // Only load device info if authenticated
    if (authenticated) {
      loadDeviceInfo()
    }
  }, [loadDeviceInfo, authenticated])

  const handleGrant = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(baseUrl('/auth/device/grant'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nd-authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          user_code: userCode,
          action: 'grant',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to grant access')
      }

      setResult('granted')
      notify(translate('ra.auth.deviceLoginGranted', { _: 'Device login granted' }), 'success')
    } catch (err) {
      setError(err.message)
      setResult('error')
      notify(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeny = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(baseUrl('/auth/device/grant'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nd-authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          user_code: userCode,
          action: 'deny',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to deny access')
      }

      setResult('denied')
      notify(translate('ra.auth.deviceLoginDenied', { _: 'Device login denied' }), 'info')
    } catch (err) {
      setError(err.message)
      setResult('error')
      notify(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    window.location.hash = '/'
  }

  // Format user agent to something readable
  const formatUserAgent = (ua) => {
    if (!ua) return 'Unknown'
    // Try to extract browser and OS
    if (ua.includes('Chrome')) return 'Chrome Browser'
    if (ua.includes('Firefox')) return 'Firefox Browser'
    if (ua.includes('Safari')) return 'Safari Browser'
    if (ua.includes('Edge')) return 'Edge Browser'
    return ua.substring(0, 50) + (ua.length > 50 ? '...' : '')
  }

  // Don't render anything if not authenticated (redirect is in progress)
  if (!authenticated) {
    return (
      <Box className={classes.root}>
        <Card className={classes.card}>
          <Box className={classes.loadingContainer}>
            <CircularProgress />
            <Typography className={classes.message}>
              {translate('ra.auth.redirectingToLogin', { _: 'Redirecting to login...' })}
            </Typography>
          </Box>
        </Card>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box className={classes.root}>
        <Card className={classes.card}>
          <Box className={classes.loadingContainer}>
            <CircularProgress />
            <Typography className={classes.message}>
              {translate('ra.auth.loading', { _: 'Loading...' })}
            </Typography>
          </Box>
        </Card>
      </Box>
    )
  }

  if (result === 'granted') {
    return (
      <Box className={classes.root}>
        <Card className={classes.card}>
          <CheckCircleOutlineIcon className={classes.successIcon} />
          <Typography variant="h5" className={classes.title}>
            {translate('ra.auth.deviceLoginSuccess', { _: 'Login Approved' })}
          </Typography>
          <Typography className={classes.message}>
            {translate('ra.auth.deviceLoginSuccessMessage', {
              _: 'The device has been granted access to your account.',
            })}
          </Typography>
          <Box mt={3}>
            <Button variant="contained" color="primary" onClick={handleClose}>
              {translate('ra.action.close', { _: 'Close' })}
            </Button>
          </Box>
        </Card>
      </Box>
    )
  }

  if (result === 'denied') {
    return (
      <Box className={classes.root}>
        <Card className={classes.card}>
          <CancelOutlinedIcon className={classes.errorIcon} />
          <Typography variant="h5" className={classes.title}>
            {translate('ra.auth.deviceLoginDeniedTitle', { _: 'Login Denied' })}
          </Typography>
          <Typography className={classes.message}>
            {translate('ra.auth.deviceLoginDeniedMessage', {
              _: 'The device has been denied access.',
            })}
          </Typography>
          <Box mt={3}>
            <Button variant="contained" color="primary" onClick={handleClose}>
              {translate('ra.action.close', { _: 'Close' })}
            </Button>
          </Box>
        </Card>
      </Box>
    )
  }

  if (result === 'expired' || result === 'error' || error) {
    return (
      <Box className={classes.root}>
        <Card className={classes.card}>
          <CancelOutlinedIcon className={classes.errorIcon} />
          <Typography variant="h5" className={classes.title}>
            {result === 'expired'
              ? translate('ra.auth.deviceCodeExpiredTitle', { _: 'Code Expired' })
              : translate('ra.auth.error', { _: 'Error' })}
          </Typography>
          <Typography className={classes.message}>
            {error || translate('ra.auth.deviceCodeExpiredMessage', {
              _: 'This code has expired. Please generate a new one.',
            })}
          </Typography>
          <Box mt={3}>
            <Button variant="contained" color="primary" onClick={handleClose}>
              {translate('ra.action.close', { _: 'Close' })}
            </Button>
          </Box>
        </Card>
      </Box>
    )
  }

  return (
    <Box className={classes.root}>
      <Card className={classes.card}>
        <ComputerIcon className={classes.icon} />

        <Typography variant="h5" className={classes.title}>
          {translate('ra.auth.deviceLoginConfirm', { _: 'Confirm Device Login' })}
        </Typography>

        <Typography>
          {translate('ra.auth.deviceLoginConfirmMessage', {
            _: 'A device is trying to log in to your account.',
          })}
        </Typography>

        <Typography className={classes.userCode}>{deviceInfo?.user_code}</Typography>

        {deviceInfo && (
          <Box className={classes.deviceInfo}>
            <Box className={classes.deviceRow}>
              <Typography className={classes.deviceLabel}>
                {translate('ra.auth.deviceIP', { _: 'IP Address' })}:
              </Typography>
              <Typography className={classes.deviceValue}>
                {deviceInfo.client_ip}
              </Typography>
            </Box>
            <Box className={classes.deviceRow}>
              <Typography className={classes.deviceLabel}>
                {translate('ra.auth.deviceBrowser', { _: 'Browser' })}:
              </Typography>
              <Typography className={classes.deviceValue}>
                {formatUserAgent(deviceInfo.user_agent)}
              </Typography>
            </Box>
          </Box>
        )}

        <Box className={classes.buttonContainer}>
          <Button
            variant="contained"
            color="primary"
            className={classes.grantButton}
            onClick={handleGrant}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircleOutlineIcon />}
          >
            {translate('ra.auth.approve', { _: 'Approve' })}
          </Button>
          <Button
            variant="outlined"
            className={classes.denyButton}
            onClick={handleDeny}
            disabled={submitting}
            startIcon={<CancelOutlinedIcon />}
          >
            {translate('ra.auth.deny', { _: 'Deny' })}
          </Button>
        </Box>
      </Card>
    </Box>
  )
}

export default DeviceGrant
