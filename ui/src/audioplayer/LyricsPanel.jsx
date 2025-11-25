import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Collapse,
} from '@material-ui/core'
import { Subject as LyricsIcon, ExpandMore } from '@material-ui/icons'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslate } from 'react-admin'
import { lyricsApi } from '../lyrics/lyricsApi'

const useStyles = makeStyles((theme) => ({
  container: {
    width: '100%',
    maxWidth: 800,
    margin: '0 auto',
    padding: theme.spacing(2),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    cursor: 'pointer',
    '&:hover': {
      opacity: 0.8,
    },
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  expandIcon: {
    transform: 'rotate(0deg)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.shortest,
    }),
  },
  expandIconOpen: {
    transform: 'rotate(180deg)',
  },
  lyricsContent: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: 1.8,
    backgroundColor: theme.palette.action.hover,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    maxHeight: 400,
    overflow: 'auto',
  },
  noLyrics: {
    textAlign: 'center',
    padding: theme.spacing(3),
    color: theme.palette.text.secondary,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
}))

export const LyricsPanel = ({ mediaFileId, songTitle }) => {
  const classes = useStyles()
  const translate = useTranslate()
  const [lyrics, setLyrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (mediaFileId && expanded) {
      loadLyrics()
    }
  }, [mediaFileId, expanded])

  const loadLyrics = async () => {
    setLoading(true)
    try {
      const approvedLyrics = await lyricsApi.getApproved(mediaFileId)
      setLyrics(approvedLyrics)
    } catch (err) {
      console.error('Error loading lyrics:', err)
      setLyrics(null)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    setExpanded(!expanded)
  }

  if (!mediaFileId) {
    return null
  }

  return (
    <Box className={classes.container}>
      <Box className={classes.header} onClick={handleToggle}>
        <Box className={classes.headerContent}>
          <LyricsIcon />
          <Typography variant="h6">
            {translate('lyrics.title', 'Lyrics')}
          </Typography>
        </Box>
        <IconButton
          className={`${classes.expandIcon} ${expanded ? classes.expandIconOpen : ''}`}
          size="small"
        >
          <ExpandMore />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        {loading ? (
          <Box className={classes.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : lyrics ? (
          <Box className={classes.lyricsContent}>{lyrics.content}</Box>
        ) : (
          <Box className={classes.noLyrics}>
            <Typography variant="body2">
              {translate('lyrics.noLyrics', 'No lyrics available for this song')}
            </Typography>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}
