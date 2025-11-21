import React, { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Card,
  IconButton,
  makeStyles,
  Fade,
  Chip,
} from '@material-ui/core'
import { useTranslate } from 'react-admin'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore'
import ShareIcon from '@material-ui/icons/Share'
import CloseIcon from '@material-ui/icons/Close'
import WrappedStatsSlide from './slides/WrappedStatsSlide'
import TopTracksSlide from './slides/TopTracksSlide'
import TopArtistsSlide from './slides/TopArtistsSlide'
import TopAlbumsSlide from './slides/TopAlbumsSlide'
import BadgesSlide from './slides/BadgesSlide'
import CommunitySlide from './slides/CommunitySlide'
import { httpClient } from '../dataProvider'

const useStyles = makeStyles((theme) => ({
  root: {
    position: 'relative',
    minHeight: 500,
  },
  slideContainer: {
    position: 'relative',
    borderRadius: theme.spacing(2),
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(3),
  },
  navButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
    '&:disabled': {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.3)',
    },
  },
  slideIndicator: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.3)',
    transition: 'all 0.3s',
  },
  activeIndicator: {
    background: 'white',
    width: 24,
    borderRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing(2),
    right: theme.spacing(2),
    color: theme.palette.text.secondary,
    zIndex: 10,
  },
  shareButton: {
    marginTop: theme.spacing(2),
    background: '#667eea',
    color: 'white',
    '&:hover': {
      background: '#764ba2',
    },
  },
}))

const WrappedSlides = ({ data, year, showShareButton = true }) => {
  const classes = useStyles()
  const translate = useTranslate()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState('next')

  const slides = [
    {
      component: WrappedStatsSlide,
      props: { data, year },
    },
    {
      component: TopTracksSlide,
      props: { tracks: data.topTracks, year },
    },
    {
      component: TopArtistsSlide,
      props: { artists: data.topArtists, year },
    },
    {
      component: TopAlbumsSlide,
      props: { albums: data.topAlbums, year },
    },
    ...(data.badges && data.badges.length > 0
      ? [
          {
            component: BadgesSlide,
            props: { badges: data.badges, year },
          },
        ]
      : []),
    ...(data.topPercentile
      ? [
          {
            component: CommunitySlide,
            props: {
              percentile: data.topPercentile,
              totalMinutes: data.totalMinutes,
              year,
            },
          },
        ]
      : []),
  ]

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection('next')
      setCurrentSlide(currentSlide + 1)
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setDirection('prev')
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleShare = async () => {
    try {
      const { json: result } = await httpClient(`/api/wrapped/${year}/share`, {
        method: 'POST',
        body: JSON.stringify({
          period: 'year',
          expiresAt: null,
        }),
      })

      // Convert /app/wrapped/share/ID to /#/wrapped/share/ID for hash routing
      const shareId = result.shareId
      const shareUrl = `${window.location.origin}/#/wrapped/share/${shareId}`

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      alert(translate('wrapped.shareLinkCopied'))
    } catch (error) {
      console.error('Error creating share:', error)
      alert(translate('error.wrapped.share'))
    }
  }

  const SlideComponent = slides[currentSlide].component
  const slideProps = slides[currentSlide].props

  return (
    <Box className={classes.root}>
      <Fade in={true} timeout={500}>
        <Box className={classes.slideContainer}>
          <SlideComponent {...slideProps} />
        </Box>
      </Fade>

      <Box className={classes.navigation}>
        <IconButton
          className={classes.navButton}
          onClick={handlePrevious}
          disabled={currentSlide === 0}
        >
          <NavigateBeforeIcon />
        </IconButton>

        <Box className={classes.slideIndicator}>
          {slides.map((_, index) => (
            <Box
              key={index}
              className={`${classes.indicator} ${
                index === currentSlide ? classes.activeIndicator : ''
              }`}
            />
          ))}
        </Box>

        <IconButton
          className={classes.navButton}
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
        >
          <NavigateNextIcon />
        </IconButton>
      </Box>

      {showShareButton && (
        <Box style={{ textAlign: 'center' }}>
          <Button
            className={classes.shareButton}
            onClick={handleShare}
            startIcon={<ShareIcon />}
          >
            {translate('wrapped.share')}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export default WrappedSlides
