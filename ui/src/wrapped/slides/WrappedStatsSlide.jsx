import React from 'react'
import { Box, Typography, Grid, makeStyles } from '@material-ui/core'
import { useTranslate } from 'react-admin'
import MusicNoteIcon from '@material-ui/icons/MusicNote'
import AlbumIcon from '@material-ui/icons/Album'
import PersonIcon from '@material-ui/icons/Person'
import AccessTimeIcon from '@material-ui/icons/AccessTime'
import { formatNumber, formatMinutesParts } from '../../utils/formatters'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: 500,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(4),
  },
  year: {
    fontSize: '4rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '3rem',
    },
  },
  subtitle: {
    fontSize: '1.5rem',
    opacity: 0.9,
  },
  statsGrid: {
    marginTop: theme.spacing(3),
  },
  statCard: {
    textAlign: 'center',
    padding: theme.spacing(3),
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.spacing(2),
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  statIcon: {
    fontSize: '3rem',
    marginBottom: theme.spacing(1),
    opacity: 0.9,
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(0.5),
  },
  statLabel: {
    fontSize: '1rem',
    opacity: 0.8,
  },
}))

const WrappedStatsSlide = ({ data, year }) => {
  const classes = useStyles()
  const translate = useTranslate()

  const minutesParts = formatMinutesParts(data.totalMinutes, translate)

  const stats = [
    {
      icon: <AccessTimeIcon className={classes.statIcon} />,
      value: minutesParts.value || '0',
      label: minutesParts.label,
    },
    {
      icon: <MusicNoteIcon className={classes.statIcon} />,
      value: formatNumber(data.totalTracks) || '0',
      label: translate('wrapped.stats.tracks'),
    },
    {
      icon: <PersonIcon className={classes.statIcon} />,
      value: formatNumber(data.uniqueArtists) || '0',
      label: translate('wrapped.stats.artists'),
    },
    {
      icon: <AlbumIcon className={classes.statIcon} />,
      value: formatNumber(data.uniqueAlbums) || '0',
      label: translate('wrapped.stats.albums'),
    },
  ]

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.year}>{year}</Typography>
        <Typography className={classes.subtitle}>
          {translate('wrapped.stats.title')}
        </Typography>
      </Box>

      <Grid container spacing={3} className={classes.statsGrid}>
        {stats.map((stat, index) => (
          <Grid item xs={6} sm={6} md={3} key={index}>
            <Box className={classes.statCard}>
              {stat.icon}
              <Typography className={classes.statValue}>
                {stat.value}
              </Typography>
              <Typography className={classes.statLabel}>
                {stat.label}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default WrappedStatsSlide
