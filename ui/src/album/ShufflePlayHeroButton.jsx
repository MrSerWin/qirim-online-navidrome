import React, { useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Box, Typography, useMediaQuery } from '@material-ui/core'
import PlayArrowIcon from '@material-ui/icons/PlayArrow'
import ShuffleIcon from '@material-ui/icons/Shuffle'
import { useDataProvider, useNotify, useTranslate } from 'react-admin'
import { useDispatch } from 'react-redux'
import { playTracks } from '../actions'

const useStyles = makeStyles(
  (theme) => ({
    heroContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing(3, 2),
      // margin: theme.spacing(2, 2, 3, 2),
      background:
      'linear-gradient(125deg, #88a52e 0%, #02c7ff 100%)',
        // theme.palette.type === 'dark'
        //   ? 'linear-gradient(135deg, #5E81AC 0%, #88C0D0 100%)'
        //   : 'linear-gradient(135deg, #5E81AC 0%, #81A1C1 100%)',
      borderRadius: theme.spacing(2),
      boxShadow:
        theme.palette.type === 'dark'
          ? '0 8px 24px rgba(94, 129, 172, 0.4)'
          : '0 8px 24px rgba(94, 129, 172, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow:
          theme.palette.type === 'dark'
            ? '0 12px 32px rgba(94, 129, 172, 0.5)'
            : '0 12px 32px rgba(94, 129, 172, 0.4)',
      },
      '&:active': {
        transform: 'translateY(0px)',
        boxShadow:
          theme.palette.type === 'dark'
            ? '0 4px 16px rgba(94, 129, 172, 0.4)'
            : '0 4px 16px rgba(94, 129, 172, 0.3)',
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        transition: 'left 0.5s ease',
      },
      '&:hover::before': {
        left: '100%',
      },
    },
    iconContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
      width: 64,
      height: 64,
      marginRight: theme.spacing(2),
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: '50%',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        animation: '$pulse 2s ease-in-out infinite',
      },
    },
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 1,
      },
      '50%': {
        transform: 'scale(1.1)',
        opacity: 0.7,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 1,
      },
    },
    playIcon: {
      fontSize: 40,
      color: '#FFFFFF',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
    },
    shuffleIcon: {
      fontSize: 20,
      color: '#FFFFFF',
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: theme.palette.type === 'dark' ? '#5E81AC' : '#4C566A',
      borderRadius: '50%',
      padding: 4,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
    },
    textContainer: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
    },
    title: {
      fontSize: '1.25rem',
      fontWeight: 700,
      color: '#FFFFFF',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)',
      lineHeight: 1.2,
    },
    subtitle: {
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.9)',
      textShadow: '0 1px 2px rgba(0,0,0,0.1)',
      marginTop: theme.spacing(0.5),
    },
  }),
  { name: 'ShufflePlayHeroButton' },
)

const ShufflePlayHeroButton = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const dataProvider = useDataProvider()
  const dispatch = useDispatch()
  const notify = useNotify()
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'), {
    noSsr: true,
  })

  const handlePlayClick = useCallback(() => {
    dataProvider
      .getList('song', {
        pagination: { page: 1, perPage: 500 },
        sort: { field: 'random', order: 'ASC' },
        filter: { missing: false },
      })
      .then((res) => {
        const data = {}
        res.data.forEach((song) => {
          data[song.id] = song
        })
        dispatch(playTracks(data))
      })
      .catch(() => {
        notify('ra.page.error', 'warning')
      })
  }, [dataProvider, dispatch, notify])

  // Only show on mobile devices
  if (!isMobile) {
    return null
  }

  return (
    <Box className={classes.heroContainer} onClick={handlePlayClick}>
      <Box className={classes.iconContainer}>
        <PlayArrowIcon className={classes.playIcon} />
        {/* <ShuffleIcon className={classes.shuffleIcon} /> */}
      </Box>
      <Box className={classes.textContainer}>
        <Typography className={classes.title}>
          {translate('resources.album.heroButton.title', {
            _: 'Shuffle & Play',
          })}
        </Typography>
        <Typography className={classes.subtitle}>
          {translate('resources.album.heroButton.subtitle', {
            _: 'Start listening to random songs',
          })}
        </Typography>
      </Box>
    </Box>
  )
}

export default ShufflePlayHeroButton
