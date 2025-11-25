import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslate, useNotify } from 'react-admin'
import { lyricsApi } from './lyricsApi'

const useStyles = makeStyles((theme) => ({
  content: {
    minWidth: 500,
    minHeight: 400,
  },
  textField: {
    marginBottom: theme.spacing(2),
  },
  lyricsField: {
    fontFamily: 'monospace',
    fontSize: '14px',
  },
  infoText: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.action.hover,
    borderRadius: theme.shape.borderRadius,
  },
}))

const languages = [
  { code: 'crh', name: 'Qırımtatarca (Crimean Tatar)' },
  { code: 'tr', name: 'Türkçe (Turkish)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'en', name: 'English' },
  { code: 'uk', name: 'Українська (Ukrainian)' },
]

export const LyricsDialog = ({ open, onClose, mediaFileId, songTitle }) => {
  const classes = useStyles()
  const translate = useTranslate()
  const notify = useNotify()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('crh')
  const [changeNote, setChangeNote] = useState('')
  const [existingLyrics, setExistingLyrics] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && mediaFileId) {
      loadExistingLyrics()
    }
  }, [open, mediaFileId])

  const loadExistingLyrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const approved = await lyricsApi.getApproved(mediaFileId)
      if (approved) {
        setExistingLyrics(approved)
        setContent(approved.content)
        setLanguage(approved.language)
      } else {
        setExistingLyrics(null)
        setContent('')
      }
    } catch (err) {
      console.error('Error loading lyrics:', err)
      setError(translate('lyrics.error.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      notify(translate('lyrics.error.contentRequired'), { type: 'warning' })
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (existingLyrics) {
        // Update existing lyrics
        await lyricsApi.update(existingLyrics.id, {
          content: content.trim(),
          language,
          changeNote: changeNote.trim(),
        })
        notify(translate('lyrics.success.updated'), { type: 'success' })
      } else {
        // Submit new lyrics
        await lyricsApi.submit({
          mediaFileId,
          content: content.trim(),
          language,
        })
        notify(translate('lyrics.success.submitted'), { type: 'success' })
      }
      handleClose()
    } catch (err) {
      console.error('Error submitting lyrics:', err)
      setError(translate('lyrics.error.submitFailed'))
      notify(translate('lyrics.error.submitFailed'), { type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setContent('')
    setLanguage('crh')
    setChangeNote('')
    setExistingLyrics(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {existingLyrics
          ? translate('lyrics.dialog.titleEdit')
          : translate('lyrics.dialog.titleAdd')}
        {songTitle && `: ${songTitle}`}
      </DialogTitle>
      <DialogContent className={classes.content}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {error && (
              <Alert severity="error" className={classes.textField}>
                {error}
              </Alert>
            )}

            <Typography variant="body2" className={classes.infoText}>
              {existingLyrics
                ? translate('lyrics.dialog.infoEdit')
                : translate('lyrics.dialog.infoAdd')}
            </Typography>

            <TextField
              select
              label={translate('lyrics.field.language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              fullWidth
              variant="outlined"
              className={classes.textField}
            >
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label={translate('lyrics.field.content')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              multiline
              rows={12}
              fullWidth
              variant="outlined"
              placeholder={translate('lyrics.field.contentPlaceholder')}
              className={classes.textField}
              InputProps={{
                classes: {
                  input: classes.lyricsField,
                },
              }}
            />

            {existingLyrics && (
              <TextField
                label={translate('lyrics.field.changeNote')}
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                fullWidth
                variant="outlined"
                placeholder={translate('lyrics.field.changeNotePlaceholder')}
                className={classes.textField}
                helperText={translate('lyrics.field.changeNoteHelper')}
              />
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          {translate('ra.action.cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading || submitting || !content.trim()}
        >
          {submitting ? (
            <CircularProgress size={24} />
          ) : existingLyrics ? (
            translate('lyrics.action.update')
          ) : (
            translate('lyrics.action.submit')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
