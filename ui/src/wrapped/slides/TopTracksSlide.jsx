import React from 'react'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  makeStyles,
} from '@material-ui/core'
import { useTranslate } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(4),
    minHeight: 500,
    background: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
    color: 'white',
  },
  header: {
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    marginBottom: theme.spacing(1),
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  subtitle: {
    fontSize: '1.2rem',
    opacity: 0.9,
  },
  list: {
    maxHeight: 350,
    overflowY: 'auto',
    '&::-webkit-scrollbar': {
      width: 8,
    },
    '&::-webkit-scrollbar-track': {
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-thumb': {
      background: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 4,
    },
  },
  listItem: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.spacing(1),
    marginBottom: theme.spacing(1),
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  rank: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginRight: theme.spacing(2),
    minWidth: 40,
  },
  trackTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  trackArtist: {
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  playCount: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
}))

const TopTracksSlide = ({ tracks, year }) => {
  const classes = useStyles()
  const translate = useTranslate()

  const topTracks = (tracks || []).slice(0, 10)

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>
          🎵 {translate('wrapped.topTracks.title')}
        </Typography>
        <Typography className={classes.subtitle}>
          {translate('wrapped.topTracks.subtitle')}
        </Typography>
      </Box>

      <List className={classes.list}>
        {topTracks.map((track, index) => (
          <ListItem key={track.id || index} className={classes.listItem}>
            <Typography className={classes.rank}>#{index + 1}</Typography>
            <ListItemText
              primary={
                <Typography className={classes.trackTitle}>
                  {track.title}
                </Typography>
              }
              secondary={
                <>
                  <Typography component="span" className={classes.trackArtist}>
                    {track.artist}
                  </Typography>
                  <br />
                  <Typography component="span" className={classes.playCount}>
                    {translate('wrapped.topTracks.plays', {
                      count: track.playCount || track.play_count || 0,
                    })}
                  </Typography>
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default TopTracksSlide
