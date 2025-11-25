import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
  IconButton,
} from '@material-ui/core'
import { MusicNote as LyricsIcon, Close as CloseIcon } from '@material-ui/icons'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslate } from 'react-admin'
import { lyricsApi } from '../lyrics/lyricsApi'

const useStyles = makeStyles((theme) => ({
  button: {
    width: '2.5rem',
    height: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  mobileButton: {
    width: 24,
    height: 24,
    padding: 0,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  mobileIcon: {
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
  },
  dialogContent: {
    minHeight: 300,
    maxHeight: 500,
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
    alignItems: 'center',
    minHeight: 200,
  },
  closeButton: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
}))

export const LyricsViewer = ({ mediaFileId, songTitle, isDesktop }) => {
  const classes = useStyles()
  const translate = useTranslate()
  const [open, setOpen] = useState(false)
  const [lyrics, setLyrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [hasLyrics, setHasLyrics] = useState(false)
  const [checked, setChecked] = useState(false)

  // Check if lyrics exist when mediaFileId changes
  useEffect(() => {
    if (mediaFileId) {
      checkLyricsAvailability()
    } else {
      setHasLyrics(false)
      setChecked(true)
    }
  }, [mediaFileId])

  useEffect(() => {
    if (open && mediaFileId && !lyrics) {
      loadLyrics()
    }
  }, [open, mediaFileId])

  const checkLyricsAvailability = async () => {
    try {
      const approvedLyrics = await lyricsApi.getApproved(mediaFileId)
      setHasLyrics(!!approvedLyrics)
      setLyrics(approvedLyrics)
    } catch (err) {
      setHasLyrics(false)
    } finally {
      setChecked(true)
    }
  }

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

  const handleOpen = (e) => {
    e.stopPropagation()
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  // Don't show button if no mediaFileId or if checked and no lyrics available
  if (!mediaFileId || (checked && !hasLyrics)) {
    return null
  }

  const buttonClass = isDesktop ? classes.button : classes.mobileButton

  return (
    <>
      <IconButton
        size={isDesktop ? 'small' : undefined}
        onClick={handleOpen}
        className={buttonClass}
        title={translate('lyrics.title', 'Lyrics')}
      >
        <LyricsIcon className={!isDesktop ? classes.mobileIcon : undefined} />
      </IconButton>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {translate('lyrics.title', 'Lyrics')}
          {songTitle && `: ${songTitle}`}
          <IconButton
            aria-label="close"
            className={classes.closeButton}
            onClick={handleClose}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent className={classes.dialogContent}>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            {translate('ra.action.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
