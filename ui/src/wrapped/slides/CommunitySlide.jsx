import React from 'react'
import { Box, Typography, makeStyles } from '@material-ui/core'
import { useTranslate } from 'react-admin'
import { formatMinutes } from '../../utils/formatters'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: 500,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(3),
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  percentileBox: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.spacing(3),
    padding: theme.spacing(4),
    border: '2px solid rgba(255, 255, 255, 0.3)',
    marginBottom: theme.spacing(3),
  },
  percentile: {
    fontSize: '5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    textShadow: '3px 3px 6px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '3.5rem',
    },
  },
  percentileLabel: {
    fontSize: '1.5rem',
    opacity: 0.9,
  },
  message: {
    fontSize: '1.3rem',
    maxWidth: 500,
    lineHeight: 1.6,
    opacity: 0.95,
  },
  stats: {
    marginTop: theme.spacing(3),
    fontSize: '1.1rem',
    opacity: 0.9,
  },
}))

const CommunitySlide = ({ percentile, totalMinutes, year }) => {
  const classes = useStyles()
  const translate = useTranslate()

  const getMessage = () => {
    if (percentile >= 95) {
      return translate('wrapped.community.message.top5')
    } else if (percentile >= 90) {
      return translate('wrapped.community.message.top10')
    } else if (percentile >= 75) {
      return translate('wrapped.community.message.top25')
    } else if (percentile >= 50) {
      return translate('wrapped.community.message.top50')
    } else {
      return translate('wrapped.community.message.default')
    }
  }

  return (
    <Box className={classes.root}>
      <Typography className={classes.title}>
        🌍 {translate('wrapped.community.title')}
      </Typography>

      <Box className={classes.percentileBox}>
        <Typography className={classes.percentile}>
          {translate('wrapped.community.percentile', {
            value: Math.round(percentile),
          })}
        </Typography>
        <Typography className={classes.percentileLabel}>
          {translate('wrapped.community.percentileLabel')}
        </Typography>
      </Box>

      <Typography className={classes.message}>{getMessage()}</Typography>

      <Typography className={classes.stats}>
        {translate('wrapped.community.totalMinutes', {
          minutes: formatMinutes(totalMinutes, translate) || '0',
        })}
      </Typography>
    </Box>
  )
}

export default CommunitySlide
