import React from 'react'
import { Box, Typography, Grid, makeStyles, Chip } from '@material-ui/core'
import { useTranslate } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: 500,
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    color: theme.palette.text.primary,
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    color: '#667eea',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  subtitle: {
    fontSize: '1.2rem',
    color: theme.palette.text.secondary,
  },
  badgesGrid: {
    marginTop: theme.spacing(3),
  },
  badgeCard: {
    textAlign: 'center',
    padding: theme.spacing(3),
    background: 'white',
    borderRadius: theme.spacing(2),
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: '4rem',
    marginBottom: theme.spacing(1),
  },
  badgeName: {
    fontSize: '1.3rem',
    fontWeight: 600,
    marginBottom: theme.spacing(1),
    color: '#667eea',
  },
  badgeDescription: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
  },
  rarityChip: {
    marginTop: theme.spacing(1),
  },
}))

const rarityColors = {
  legendary: '#FFD700',
  epic: '#9C27B0',
  rare: '#2196F3',
  common: '#757575',
}

const BadgesSlide = ({ badges = [], year }) => {
  const classes = useStyles()
  const translate = useTranslate()

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>
          🏆 {translate('wrapped.badges.title')}
        </Typography>
        <Typography className={classes.subtitle}>
          {translate('wrapped.badges.subtitle')}
        </Typography>
      </Box>

      <Grid container spacing={3} className={classes.badgesGrid}>
        {badges.map((badge, index) => (
          <Grid item xs={12} sm={6} md={4} key={badge.id || index}>
            <Box className={classes.badgeCard}>
              <Typography className={classes.badgeIcon}>{badge.icon}</Typography>
              <Typography className={classes.badgeName}>
                {badge.name}
              </Typography>
              <Typography className={classes.badgeDescription}>
                {badge.description}
              </Typography>
              <Chip
                label={translate(`wrapped.badges.rarity.${badge.rarity}`)}
                size="small"
                className={classes.rarityChip}
                style={{
                  background: rarityColors[badge.rarity] || rarityColors.common,
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default BadgesSlide
