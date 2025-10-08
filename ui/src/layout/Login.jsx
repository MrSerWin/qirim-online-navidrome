import React, { useState, useCallback, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Field, Form } from 'react-final-form'
import { useDispatch } from 'react-redux'
import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardActions from '@material-ui/core/CardActions'
import CircularProgress from '@material-ui/core/CircularProgress'
import Link from '@material-ui/core/Link'
import TextField from '@material-ui/core/TextField'
import { useMediaQuery } from '@material-ui/core'
import { ThemeProvider, makeStyles } from '@material-ui/core/styles'
import {
  createMuiTheme,
  useLogin,
  useNotify,
  useRefresh,
  useSetLocale,
  useTranslate,
  useVersion,
} from 'react-admin'
import { useSelector } from 'react-redux'

import Logo from '../icons/new-logo-no-bg.png'
import LogoWhite from '../icons/new-logo-no-bg-white.png'

import Notification from './Notification'
import useCurrentTheme from '../themes/useCurrentTheme'
import config from '../config'
import { clearQueue } from '../actions'
import { retrieveTranslation } from '../i18n'
import { INSIGHTS_DOC_URL, AUTO_THEME_ID } from '../consts.js'
import { baseUrl } from '../utils'

const useStyles = makeStyles(
  (theme) => ({
    main: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'flex-start',
      background: `url(${config.loginBackgroundURL})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    card: {
      minWidth: 400,
      marginTop: '6em',
      overflow: 'visible',
    },
    avatar: {
      margin: '1em',
      display: 'flex',
      justifyContent: 'center',
      marginTop: '-3em',
    },
    icon: {
      backgroundColor: 'transparent',
      width: '6.3em',
      height: '6.3em',
    },
    systemName: {
      marginTop: '1em',
      display: 'flex',
      justifyContent: 'center',
      color: '#fefef9', //theme.palette.grey[500]
    },
    welcome: {
      marginTop: '1em',
      padding: '0 1em 1em 1em',
      display: 'flex',
      justifyContent: 'center',
      flexWrap: 'wrap',
      color: '#fefef9', //theme.palette.grey[500]
    },
    form: {
      padding: '0 1em 1em 1em',
    },
    input: {
      marginTop: '1em',
    },
    actions: {
      padding: '0 1em 1em 1em',
    },
    button: {},
    systemNameLink: {
      textDecoration: 'none',
      color: '#ffffff'
    },
    message: {
      marginTop: '1em',
      padding: '0 1em 1em 1em',
      textAlign: 'center',
      wordBreak: 'break-word',
      fontSize: '0.875em',
    },
  }),
  { name: 'NDLogin' },
)

const renderInput = ({
  meta: { touched, error } = {},
  input: { ...inputProps },
  ...props
}) => (
  <TextField
    error={!!(touched && error)}
    helperText={touched && error}
    {...inputProps}
    {...props}
    fullWidth
  />
)

const FormLogin = ({ loading, handleSubmit, validate, showToggle, onToggle }) => {
  const translate = useTranslate()
  const classes = useStyles()
    const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)')

  const logo = useSelector((state) => {
    if (state.theme === AUTO_THEME_ID) {
      return prefersLightMode ? Logo : LogoWhite;
    }

    if (state.theme === 'LigeraTheme' || state.theme === 'LightTheme') {
      return Logo;
    }

    return LogoWhite;
  })

  return (
    <Form
      onSubmit={handleSubmit}
      validate={validate}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit} noValidate>
          <div className={classes.main}>
            <Card className={classes.card}>
              <div className={classes.avatar}>
                <img src={logo} className={classes.icon} alt={'logo'} />
              </div>
              <div className={classes.systemName}>
                <a
                  href="https://qirim.online"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={classes.systemNameLink}
                >
                  Qırım Online
                </a>
              </div>
              {config.welcomeMessage && (
                <div
                  className={classes.welcome}
                  dangerouslySetInnerHTML={{ __html: config.welcomeMessage }}
                />
              )}
              <div className={classes.form}>
                <div className={classes.input}>
                  <Field
                    autoFocus
                    name="username"
                    component={renderInput}
                    label={translate('ra.auth.username')}
                    disabled={loading}
                    spellCheck={false}
                  />
                </div>
                <div className={classes.input}>
                  <Field
                    name="password"
                    component={renderInput}
                    label={translate('ra.auth.password')}
                    type="password"
                    disabled={loading}
                  />
                </div>
              </div>
              <CardActions className={classes.actions}>
                <Button
                  variant="contained"
                  type="submit"
                  color="primary"
                  disabled={loading}
                  className={classes.button}
                  fullWidth
                >
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {translate('ra.auth.sign_in')}
                </Button>
              </CardActions>
              {showToggle && (
                <CardActions className={classes.actions}>
                  <Button
                    variant="text"
                    onClick={onToggle}
                    disabled={loading}
                    fullWidth
                  >
                    {translate('ra.auth.needAccount')}
                  </Button>
                </CardActions>
              )}
            </Card>
            <Notification />
          </div>
        </form>
      )}
    />
  )
}

const InsightsNotice = ({ url }) => {
  const translate = useTranslate()
  const classes = useStyles()

  const anchorRegex = /\[(.+?)]/g
  const originalMsg = translate('ra.auth.insightsCollectionNote')

  // Split the entire message on newlines
  const lines = originalMsg.split('\n')

  const renderedLines = lines.map((line, lineIndex) => {
    const segments = []
    let lastIndex = 0
    let match

    // Find bracketed text in each line
    while ((match = anchorRegex.exec(line)) !== null) {
      // match.index is where "[something]" starts
      // match[1] is the text inside the brackets
      const bracketText = match[1]

      // Push the text before the bracket
      segments.push(line.slice(lastIndex, match.index))

      // Push the <Link> component
      segments.push(
        <Link
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          key={`${lineIndex}-${match.index}`}
          style={{ cursor: 'pointer' }}
        >
          {bracketText}
        </Link>,
      )

      // Update lastIndex to the character right after the bracketed text
      lastIndex = match.index + match[0].length
    }

    // Push the remaining text after the last bracket
    segments.push(line.slice(lastIndex))

    // Return this line’s parts, plus a <br/> if not the last line
    return (
      <React.Fragment key={lineIndex}>
        {segments}
        {lineIndex < lines.length - 1 && <br />}
      </React.Fragment>
    )
  })

  return <div className={classes.message}>{renderedLines}</div>
}

const FormSignUp = ({ loading, handleSubmit, validate, showToggle, onToggle }) => {
  const translate = useTranslate()
  const classes = useStyles()

  return (
    <Form
      onSubmit={handleSubmit}
      validate={validate}
      render={({ handleSubmit }) => (
        <form onSubmit={handleSubmit} noValidate>
          <div className={classes.main}>
            <Card className={classes.card}>
              <div className={classes.avatar}>
                <img src={Logo} className={classes.icon} alt={'logo'} />
              </div>
              <div className={classes.welcome}>
                {showToggle ? translate('ra.auth.createAccount') : translate('ra.auth.welcome1')}
              </div>
              {!showToggle && (
                <div className={classes.welcome}>
                  {translate('ra.auth.welcome2')}
                </div>
              )}
              <div className={classes.form}>
                <div className={classes.input}>
                  <Field
                    autoFocus
                    name="username"
                    component={renderInput}
                    label={translate('ra.auth.username')}
                    disabled={loading}
                    spellCheck={false}
                  />
                </div>
                <div className={classes.input}>
                  <Field
                    name="email"
                    component={renderInput}
                    label={translate('ra.auth.email')}
                    type="email"
                    disabled={loading}
                    spellCheck={false}
                  />
                </div>
                <div className={classes.input}>
                  <Field
                    name="password"
                    component={renderInput}
                    label={translate('ra.auth.password')}
                    type="password"
                    disabled={loading}
                  />
                </div>
                <div className={classes.input}>
                  <Field
                    name="confirmPassword"
                    component={renderInput}
                    label={translate('ra.auth.confirmPassword')}
                    type="password"
                    disabled={loading}
                  />
                </div>
                {/* Honeypot field - hidden from users, only bots will fill it */}
                <div style={{ position: 'absolute', left: '-9999px' }}>
                  <Field
                    name="website"
                    component={renderInput}
                    label="Website"
                    tabIndex="-1"
                    autoComplete="off"
                  />
                </div>
              </div>
              <CardActions className={classes.actions}>
                <Button
                  variant="contained"
                  type="submit"
                  color="primary"
                  disabled={loading}
                  className={classes.button}
                  fullWidth
                >
                  {loading && <CircularProgress size={25} thickness={2} />}
                  {showToggle ? translate('ra.auth.buttonSignUp') : translate('ra.auth.buttonCreateAdmin')}
                </Button>
              </CardActions>
              {showToggle && (
                <CardActions className={classes.actions}>
                  <Button
                    variant="text"
                    onClick={onToggle}
                    disabled={loading}
                    fullWidth
                  >
                    {translate('ra.auth.haveAccount')}
                  </Button>
                </CardActions>
              )}
              {!showToggle && <InsightsNotice url={INSIGHTS_DOC_URL} />}
            </Card>
            <Notification />
          </div>
        </form>
      )}
    />
  )
}

const Login = ({ location }) => {
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const translate = useTranslate()
  const notify = useNotify()
  const login = useLogin()
  const dispatch = useDispatch()

  const handleSubmit = useCallback(
    (auth) => {
      setLoading(true)
      dispatch(clearQueue())

      // Check honeypot field for bots (only on signup)
      if (isSignup && auth.website) {
        // If honeypot field is filled, it's likely a bot
        setLoading(false)
        notify('ra.auth.sign_up_error', 'warning')
        return
      }

      // Determine the URL based on whether we're signing up or logging in
      const url = isSignup ? baseUrl('/auth/signup') : baseUrl('/auth/login')
      const requestBody = isSignup
        ? { username: auth.username, password: auth.password, email: auth.email }
        : { username: auth.username, password: auth.password }

      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      })

      if (isSignup) {
        // Handle signup
        fetch(request)
          .then((response) => {
            if (response.status < 200 || response.status >= 300) {
              return response.json().then((errorData) => {
                // Extract error message from response
                const errorMessage = errorData.error || errorData.message || 'Signup failed'
                throw new Error(errorMessage)
              }).catch((jsonError) => {
                // If response is not JSON, throw generic error
                if (jsonError instanceof SyntaxError) {
                  throw new Error('Signup failed')
                }
                throw jsonError
              })
            }
            return response.json()
          })
          .then(() => {
            // After successful signup, log in
            login(auth, location.state ? location.state.nextPathname : '/')
          })
          .catch((error) => {
            setLoading(false)
            // Display the actual error message from backend
            notify(
              typeof error === 'string'
                ? error
                : error.message || 'ra.auth.sign_up_error',
              'warning',
            )
          })
      } else {
        // Handle login
        login(auth, location.state ? location.state.nextPathname : '/').catch(
          (error) => {
            setLoading(false)
            notify(
              typeof error === 'string'
                ? error
                : typeof error === 'undefined' || !error.message
                  ? 'ra.auth.sign_in_error'
                  : error.message,
              'warning',
            )
          },
        )
      }
    },
    [dispatch, login, notify, setLoading, location, isSignup],
  )

  const validateLogin = useCallback(
    (values) => {
      const errors = {}
      if (!values.username) {
        errors.username = translate('ra.validation.required')
      }
      if (!values.password) {
        errors.password = translate('ra.validation.required')
      }
      return errors
    },
    [translate],
  )

  const validateSignup = useCallback(
    (values) => {
      const errors = validateLogin(values)

      // Username validation (3-50 chars, alphanumeric + _ - .)
      if (values.username) {
        if (values.username.length < 3) {
          errors.username = translate('ra.validation.minLength', { min: 3 })
        } else if (values.username.length > 50) {
          errors.username = translate('ra.validation.maxLength', { max: 50 })
        } else {
          // Check valid characters
          const validUsername = /^[a-zA-Z0-9_.-]+$/
          if (!validUsername.test(values.username)) {
            errors.username = translate('ra.validation.username_invalid_chars')
          }
        }
      }

      // Password validation (8+ chars, must contain letter + number)
      if (values.password) {
        if (values.password.length < 8) {
          errors.password = translate('ra.validation.password_min_length')
        } else if (values.password.length > 100) {
          errors.password = translate('ra.validation.maxLength', { max: 100 })
        } else {
          const hasLetter = /[a-zA-Z]/.test(values.password)
          const hasNumber = /[0-9]/.test(values.password)
          if (!hasLetter || !hasNumber) {
            errors.password = translate('ra.validation.password_complexity')
          }
        }
      }

      // Email validation (optional)
      if (values.email && values.email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(values.email)) {
          errors.email = translate('ra.validation.email')
        }
      }

      if (!values.confirmPassword) {
        errors.confirmPassword = translate('ra.validation.required')
      }
      if (values.confirmPassword !== values.password) {
        errors.confirmPassword = translate('ra.validation.passwordDoesNotMatch')
      }
      return errors
    },
    [translate, validateLogin],
  )

  if (config.firstTime) {
    return (
      <FormSignUp
        handleSubmit={handleSubmit}
        validate={validateSignup}
        loading={loading}
      />
    )
  }

  // Show signup/login toggle if self-registration is enabled
  if (config.enableSelfRegistration && isSignup) {
    return (
      <FormSignUp
        handleSubmit={handleSubmit}
        validate={validateSignup}
        loading={loading}
        showToggle={true}
        onToggle={() => setIsSignup(false)}
      />
    )
  }

  return (
    <FormLogin
      handleSubmit={handleSubmit}
      validate={validateLogin}
      loading={loading}
      showToggle={config.enableSelfRegistration}
      onToggle={() => setIsSignup(true)}
    />
  )
}

Login.propTypes = {
  authProvider: PropTypes.func,
  previousRoute: PropTypes.string,
}

// We need to put the ThemeProvider decoration in another component
// Because otherwise the useStyles() hook used in Login won't get
// the right theme
const LoginWithTheme = (props) => {
  const theme = useCurrentTheme()
  const setLocale = useSetLocale()
  const refresh = useRefresh()
  const version = useVersion()

  useEffect(() => {
    if (config.defaultLanguage !== '' && !localStorage.getItem('locale')) {
      retrieveTranslation(config.defaultLanguage)
        .then(() => {
          setLocale(config.defaultLanguage).then(() => {
            localStorage.setItem('locale', config.defaultLanguage)
          })
          refresh(true)
        })
        .catch((e) => {
          throw new Error(
            'Cannot load language "' + config.defaultLanguage + '": ' + e,
          )
        })
    }
  }, [refresh, setLocale])

  return (
    <ThemeProvider theme={createMuiTheme(theme)}>
      <Login key={version} {...props} />
    </ThemeProvider>
  )
}

export default LoginWithTheme
