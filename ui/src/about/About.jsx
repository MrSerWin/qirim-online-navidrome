import React from 'react'
import {
  Box,
  Card,
  Typography,
  makeStyles,
  Grid,
} from '@material-ui/core'
import { useTranslate, Title as PageTitle } from 'react-admin'
import { Title } from '../common/Title'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: theme.spacing(6, 4),
    borderRadius: theme.spacing(2),
    marginBottom: theme.spacing(4),
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
    },
  },
  headerTitle: {
    fontSize: '3rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    position: 'relative',
    zIndex: 1,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  headerSubtitle: {
    fontSize: '1.3rem',
    fontWeight: 300,
    opacity: 0.95,
    position: 'relative',
    zIndex: 1,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.1rem',
    },
  },
  section: {
    marginBottom: theme.spacing(5),
    animation: '$slideIn 0.6s ease-out backwards',
  },
  '@keyframes slideIn': {
    from: {
      opacity: 0,
      transform: 'translateX(-30px)',
    },
    to: {
      opacity: 1,
      transform: 'translateX(0)',
    },
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
  },
  highlight: {
    background: 'linear-gradient(120deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
    padding: theme.spacing(3),
    borderRadius: theme.spacing(1),
    borderLeft: '4px solid #667eea',
    margin: theme.spacing(3, 0),
  },
  founders: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(3),
    marginTop: theme.spacing(3),
    flexWrap: 'wrap',
  },
  founder: {
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%)'
      : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: theme.spacing(3),
    borderRadius: theme.spacing(2),
    textAlign: 'center',
    flex: 1,
    minWidth: 200,
    maxWidth: 250,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    },
  },
  founderName: {
    color: '#667eea',
    fontSize: '1.3rem',
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },
  founderRole: {
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
  },
  cta: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: theme.spacing(4),
    borderRadius: theme.spacing(2),
    textAlign: 'center',
    marginTop: theme.spacing(4),
  },
  ctaTitle: {
    color: 'white',
    fontSize: '2rem',
    marginBottom: theme.spacing(2),
    fontWeight: 600,
  },
  ctaText: {
    color: 'white',
    fontSize: '1.2rem',
    marginBottom: 0,
  },
  ctaThankYou: {
    marginTop: theme.spacing(2),
    fontSize: '1.4rem',
    fontWeight: 600,
  },
  paragraph: {
    fontSize: '1.1rem',
    marginBottom: theme.spacing(2),
    color: theme.palette.text.secondary,
    lineHeight: 1.7,
  },
  contactSection: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(3),
    background: theme.palette.type === 'dark'
      ? 'rgba(255, 255, 255, 0.05)'
      : 'rgba(0, 0, 0, 0.02)',
    borderRadius: theme.spacing(1),
  },
  contactTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.5),
    fontSize: '1rem',
  },
  contactLabel: {
    fontWeight: 600,
    marginRight: theme.spacing(1),
    minWidth: 180,
    color: theme.palette.text.primary,
  },
  contactLink: {
    color: '#667eea',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}))

const About = () => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <Box className={classes.root}>
      <PageTitle title={<Title subTitle={translate('menu.about.name')} />} />

      <Typography className={classes.sectionTitle}>
        {translate('menu.about.header.title')}
      </Typography>

      {/* Mission Section */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          {translate('menu.about.mission.title')}
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            {translate('menu.about.mission.intro')}
          </Typography>
          <Box className={classes.highlight}>
            <Typography className={classes.paragraph} style={{ marginBottom: 0 }}>
              {translate('menu.about.mission.highlight')}
            </Typography>
          </Box>
        </Card>
      </Box>

      {/* History Section */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          {translate('menu.about.history.title')}
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            {translate('menu.about.history.intro')}
          </Typography>
          <Typography className={classes.paragraph}>
            {translate('menu.about.history.initial')}
          </Typography>
          <Typography className={classes.paragraph} style={{ fontWeight: 600 }}>
            {translate('menu.about.history.turning')}
          </Typography>
          <Typography className={classes.paragraph}>
            {translate('menu.about.history.discovery')}
          </Typography>
          <Box className={classes.highlight}>
            <Typography className={classes.paragraph} style={{ marginBottom: 0 }}>
              {translate('menu.about.history.highlight')}
            </Typography>
          </Box>
          <Typography className={classes.paragraph}>
            {translate('menu.about.history.transformation')}
          </Typography>
        </Card>
      </Box>

      {/* Founders Section */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          {translate('menu.about.founders.title')}
        </Typography>
        <Card className={classes.card}>
          <Typography className={classes.paragraph}>
            {translate('menu.about.founders.intro')}
          </Typography>
          <Box className={classes.founders}>
            <Box className={classes.founder}>
              <Typography className={classes.founderName}>
                {translate('menu.about.founders.servin.name')}
              </Typography>
              <Typography className={classes.founderRole}>
                {translate('menu.about.founders.servin.role')}
              </Typography>
            </Box>
            <Box className={classes.founder}>
              <Typography className={classes.founderName}>
                {translate('menu.about.founders.emil.name')}
              </Typography>
              <Typography className={classes.founderRole}>
                {translate('menu.about.founders.emil.role')}
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Contact Information Section */}
      <Box className={classes.section}>
        <Typography variant="h2" className={classes.sectionTitle}>
          {translate('menu.about.contact.title')}
        </Typography>
        <Card className={classes.card}>
          <Box className={classes.contactSection}>
            <Box className={classes.contactItem}>
              <Typography className={classes.contactLabel}>
                {translate('menu.about.contact.website')}:
              </Typography>
              <a
                href="https://qirim.online"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.contactLink}
              >
                https://qirim.online
              </a>
            </Box>
            <Box className={classes.contactItem}>
              <Typography className={classes.contactLabel}>
                {translate('menu.about.contact.email')}:
              </Typography>
              <a
                href="mailto:contact@qirim.online"
                className={classes.contactLink}
              >
                contact@qirim.online
              </a>
            </Box>
            <Box className={classes.contactItem}>
              <Typography className={classes.contactLabel}>
                {translate('menu.about.contact.privacy')}:
              </Typography>
              <a
                href="https://qirim.online/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.contactLink}
              >
                qirim.online/privacy.html
              </a>
            </Box>
            <Box className={classes.contactItem}>
              <Typography className={classes.contactLabel}>
                {translate('menu.about.contact.builtOn')}:
              </Typography>
              <a
                href="https://github.com/navidrome/navidrome"
                target="_blank"
                rel="noopener noreferrer"
                className={classes.contactLink}
              >
                github.com/navidrome/navidrome
              </a>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* CTA Section */}
      <Box className={classes.cta}>
        <Typography className={classes.ctaTitle}>
          {translate('menu.about.cta.title')}
        </Typography>
        <Typography className={classes.ctaText}>
          {translate('menu.about.cta.description')}
        </Typography>
        <Typography className={classes.ctaThankYou}>
          {translate('menu.about.cta.thankYou')}
        </Typography>
      </Box>
    </Box>
  )
}

export default About
