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
    background: 'linear-gradient(135deg, #00539c 0%, #00f2fe 100%)',
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
  artistName: {
    fontSize: '1.2rem',
    fontWeight: 600,
  },
  artistStats: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
}))

const TopArtistsSlide = ({ artists, year }) => {
  const classes = useStyles()
  const translate = useTranslate()

  const topArtists = (artists || []).slice(0, 10)

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title}>
          🎤 {translate('wrapped.topArtists.title')}
        </Typography>
        <Typography className={classes.subtitle}>
          {translate('wrapped.topArtists.subtitle')}
        </Typography>
      </Box>

      <List className={classes.list}>
        {topArtists.map((artist, index) => (
          <ListItem key={artist.id || index} className={classes.listItem}>
            <Typography className={classes.rank}>#{index + 1}</Typography>
            <ListItemText
              primary={
                <Typography className={classes.artistName}>
                  {artist.name}
                </Typography>
              }
              secondary={
                <Typography className={classes.artistStats}>
                  {translate('wrapped.topArtists.plays', {
                    count: artist.playCount || artist.play_count || 0,
                  })}
                  {' • '}
                  {translate('wrapped.topArtists.minutes', {
                    count: artist.minutesPlayed || artist.minutes_played || 0,
                  })}
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  )
}

export default TopArtistsSlide
