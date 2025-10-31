import React from 'react'
import {
  Box,
  Card,
  Typography,
  makeStyles,
  Divider,
  Grid,
  Button,
  IconButton,
} from '@material-ui/core'
import OpenInNewIcon from '@material-ui/icons/OpenInNew'
import AndroidIcon from '@material-ui/icons/Android'
import AppleIcon from '@material-ui/icons/Apple'
import LanguageIcon from '@material-ui/icons/Language'
import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet'
import FileCopyIcon from '@material-ui/icons/FileCopy'
import { useNotify, useTranslate, Title as PageTitle } from 'react-admin'
import { Title } from '../common/Title'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.primary.main,
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 600,
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  },
  card: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 24px rgba(0, 0, 0, 0.4)'
        : '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  },
  clickableCard: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 24px rgba(0, 0, 0, 0.4)'
        : '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
    '&:active': {
      transform: 'translateY(-2px)',
    },
  },
  projectTitle: {
    fontSize: '1.4rem',
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.primary.main,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.primary.main,
    textDecoration: 'none',
    fontSize: '1.1rem',
    marginBottom: theme.spacing(1),
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  platformButton: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
    textTransform: 'none',
    fontWeight: 500,
  },
  donationCard: {
    padding: theme.spacing(3),
    marginTop: theme.spacing(3),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
      : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    border: theme.palette.type === 'dark'
      ? '2px solid rgba(255, 255, 255, 0.1)'
      : '2px solid rgba(33, 150, 243, 0.2)',
  },
  walletAddress: {
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    padding: theme.spacing(1.5),
    background: theme.palette.type === 'dark'
      ? 'rgba(0, 0, 0, 0.3)'
      : 'rgba(255, 255, 255, 0.7)',
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    wordBreak: 'break-all',
    border: theme.palette.type === 'dark'
      ? '1px solid rgba(255, 255, 255, 0.1)'
      : '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  walletText: {
    flex: 1,
    userSelect: 'all',
  },
  copyButton: {
    padding: theme.spacing(0.5),
    '&:hover': {
      background: theme.palette.type === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
    },
  },
  partnerLogo: {
    width: 200,
    height: 60,
    objectFit: 'contain',
    marginBottom: theme.spacing(2),
  },
}))

const Partners = () => {
  const classes = useStyles()
  const notify = useNotify()
  const translate = useTranslate()

  const copyToClipboard = async (text, label) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        notify(translate('menu.partners.support.copied', { label }), { type: 'info' })
      } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        try {
          document.execCommand('copy')
          notify(translate('menu.partners.support.copied', { label }), { type: 'info' })
        } catch (err) {
          notify(translate('ra.notification.http_error'), { type: 'error' })
        }
        document.body.removeChild(textArea)
      }
    } catch (err) {
      notify(translate('ra.notification.http_error'), { type: 'error' })
    }
  }

  const handleCardClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const projects = [
    {
      name: 'Sinonimler luğatı',
      descriptionKey: 'menu.partners.descriptions.synonymsDict',
      web: 'https://ana-yurt.com/qrt/synonim-lugat',
      android: 'https://play.google.com/store/apps/details?id=com.anaurt.SynonimicLugat',
      ios: 'https://apps.apple.com/us/app/sinonimler-lu%C4%9Fat%C4%B1/id1453892418',
    },
    {
      name: 'Qırımtatar luğatı',
      descriptionKey: 'menu.partners.descriptions.qirimtatarDict',
      web: 'https://ana-yurt.com/qrt/lugat',
      webCyrillic: 'https://ana-yurt.com/qrt/krymskotatarsko-russkiy-slovar-na-kirillice',
      android: 'https://play.google.com/store/apps/details?id=com.anaurt.lugat',
      ios: 'https://apps.apple.com/id/app/q%C4%B1r%C4%B1mtatar-lu%C4%9Fat%C4%B1/id1457493656',
    },
    {
      name: 'Qirim Junior',
      descriptionKey: 'menu.partners.descriptions.qirimJunior',
      web: 'https://qirimjr.org/',
      android: 'https://play.google.com/store/apps/details?id=com.anaurt.QirimJunior',
      ios: 'https://apps.apple.com/us/app/qirim-junior/id1459040436',
    },
  ]

  return (
    <Box className={classes.root}>
      <PageTitle title={<Title subTitle={translate('menu.partners.name')} />} />

      {/* Partner Websites */}
      <Typography className={classes.sectionTitle}>
        {translate('menu.partners.sections.partners')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            className={classes.clickableCard}
            onClick={() => handleCardClick('https://ana-yurt.com/')}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <LanguageIcon style={{ marginRight: 8 }} />
              <Typography variant="h6" style={{ fontWeight: 600, flex: 1 }}>
                ana-yurt.com
              </Typography>
              <OpenInNewIcon fontSize="small" />
            </Box>
            <Typography variant="body2" color="textSecondary">
              {translate('menu.partners.descriptions.anaYurt')}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            className={classes.clickableCard}
            onClick={() => handleCardClick('https://ana-yurt.online/')}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <LanguageIcon style={{ marginRight: 8 }} />
              <Typography variant="h6" style={{ fontWeight: 600, flex: 1 }}>
                ana-yurt.online
              </Typography>
              <OpenInNewIcon fontSize="small" />
            </Box>
            <Typography variant="body2" color="textSecondary">
              {translate('menu.partners.descriptions.anaYurtOnline')}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Divider style={{ margin: '40px 0' }} />

      {/* Useful Resources */}
      <Typography className={classes.sectionTitle}>
        {translate('menu.partners.sections.resources')}
      </Typography>

      {projects.map((project, index) => (
        <Card key={index} className={classes.card}>
          <Typography className={classes.projectTitle}>
            {project.name}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {translate(project.descriptionKey)}
          </Typography>

          <Box mt={2}>
            {project.web && (
              <Button
                variant="outlined"
                color="primary"
                className={classes.platformButton}
                href={project.web}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<LanguageIcon />}
              >
                {translate('menu.partners.platforms.webLatin')}
              </Button>
            )}

            {project.webCyrillic && (
              <Button
                variant="outlined"
                color="primary"
                className={classes.platformButton}
                href={project.webCyrillic}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<LanguageIcon />}
              >
                {translate('menu.partners.platforms.webCyrillic')}
              </Button>
            )}

            {project.android && (
              <Button
                variant="outlined"
                color="primary"
                className={classes.platformButton}
                href={project.android}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<AndroidIcon />}
              >
                {translate('menu.partners.platforms.android')}
              </Button>
            )}

            {project.ios && (
              <Button
                variant="outlined"
                color="primary"
                className={classes.platformButton}
                href={project.ios}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<AppleIcon />}
              >
                {translate('menu.partners.platforms.ios')}
              </Button>
            )}
          </Box>
        </Card>
      ))}

      <Divider style={{ margin: '40px 0' }} />

      {/* Donation Section */}
      <Typography className={classes.sectionTitle}>
        {translate('menu.partners.sections.support')}
      </Typography>

      <Card className={classes.donationCard}>
        <Box display="flex" alignItems="center" mb={2}>
          <AccountBalanceWalletIcon style={{ marginRight: 8, fontSize: '2rem' }} />
          <Typography variant="h6" style={{ fontWeight: 600 }}>
            {translate('menu.partners.support.title')}
          </Typography>
        </Box>

        <Typography variant="body1" paragraph>
          {translate('menu.partners.support.description')}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
              Ethereum (ETH)
            </Typography>
            <Box className={classes.walletAddress}>
              <Typography className={classes.walletText} variant="body2">
                0x7E43FD050993B2C0a76624025cfd458BDF6c97F7
              </Typography>
              <IconButton
                size="small"
                className={classes.copyButton}
                onClick={() => copyToClipboard('0x7E43FD050993B2C0a76624025cfd458BDF6c97F7', 'ETH адрес')}
                aria-label="Copy ETH address"
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
              Bitcoin (BTC)
            </Typography>
            <Box className={classes.walletAddress}>
              <Typography className={classes.walletText} variant="body2">
                bc1qhdyz7n9nylg42e7pfyhg2wlg2mfyekv90qulgq
              </Typography>
              <IconButton
                size="small"
                className={classes.copyButton}
                onClick={() => copyToClipboard('bc1qhdyz7n9nylg42e7pfyhg2wlg2mfyekv90qulgq', 'BTC адрес')}
                aria-label="Copy BTC address"
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" style={{ fontWeight: 600 }}>
              USDT (ERC20)
            </Typography>
            <Box className={classes.walletAddress}>
              <Typography className={classes.walletText} variant="body2">
                0x7E43FD050993B2C0a76624025cfd458BDF6c97F7
              </Typography>
              <IconButton
                size="small"
                className={classes.copyButton}
                onClick={() => copyToClipboard('0x7E43FD050993B2C0a76624025cfd458BDF6c97F7', 'USDT адрес')}
                aria-label="Copy USDT address"
              >
                <FileCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Box>
  )
}

export default Partners
