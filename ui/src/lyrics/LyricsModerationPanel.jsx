import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Divider,
} from '@material-ui/core'
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  FileCopy as CopyIcon,
} from '@material-ui/icons'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslate, useNotify } from 'react-admin'
import { lyricsApi } from './lyricsApi'

const useStyles = makeStyles((theme) => ({
  card: {
    marginBottom: theme.spacing(2),
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(145deg, #1e1e1e 0%, #2d2d2d 100%)'
      : 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 20px rgba(0, 0, 0, 0.3)'
      : '0 4px 20px rgba(0, 0, 0, 0.08)',
  },
  listItem: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
  },
  lyricsPreview: {
    maxHeight: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: theme.palette.action.hover,
    padding: theme.spacing(1.5),
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
  lyricsFullView: {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    fontSize: '14px',
    backgroundColor: theme.palette.action.hover,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    maxHeight: 400,
    overflow: 'auto',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
}))

export const LyricsModerationPanel = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const notify = useNotify()

  const [loading, setLoading] = useState(true)
  const [pendingLyrics, setPendingLyrics] = useState([])
  const [total, setTotal] = useState(0)
  const [viewDialog, setViewDialog] = useState(false)
  const [rejectDialog, setRejectDialog] = useState(false)
  const [selectedLyrics, setSelectedLyrics] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadPendingLyrics()
  }, [])

  const loadPendingLyrics = async () => {
    setLoading(true)
    try {
      const data = await lyricsApi.getPending(50, 0)
      setPendingLyrics(data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Error loading pending lyrics:', err)
      notify(translate('lyrics.moderation.error.loadFailed'), { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleView = (lyrics) => {
    setSelectedLyrics(lyrics)
    setViewDialog(true)
  }

  const handleApprove = async (lyrics) => {
    setProcessing(true)
    try {
      await lyricsApi.approve(lyrics.id)
      notify(translate('lyrics.moderation.success.approved'), {
        type: 'success',
      })
      loadPendingLyrics()
    } catch (err) {
      console.error('Error approving lyrics:', err)
      notify(translate('lyrics.moderation.error.approveFailed'), {
        type: 'error',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleRejectClick = (lyrics) => {
    setSelectedLyrics(lyrics)
    setRejectNote('')
    setRejectDialog(true)
  }

  const handleRejectConfirm = async () => {
    if (!selectedLyrics) return

    setProcessing(true)
    try {
      await lyricsApi.reject(selectedLyrics.id, rejectNote)
      notify(translate('lyrics.moderation.success.rejected'), {
        type: 'success',
      })
      setRejectDialog(false)
      setSelectedLyrics(null)
      setRejectNote('')
      loadPendingLyrics()
    } catch (err) {
      console.error('Error rejecting lyrics:', err)
      notify(translate('lyrics.moderation.error.rejectFailed'), {
        type: 'error',
      })
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id)
    notify(translate('lyrics.moderation.idCopied'), { type: 'info' })
  }

  if (loading) {
    return (
      <Box className={classes.loadingContainer}>
        <CircularProgress />
      </Box>
    )
  }

  if (pendingLyrics.length === 0) {
    return (
      <Card className={classes.card}>
        <CardContent>
          <Box className={classes.emptyState}>
            <Typography variant="h6">
              {translate('lyrics.moderation.noPending')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {translate('lyrics.moderation.subtitle', { count: total })}
      </Typography>

      <List>
        {pendingLyrics.map((lyrics) => (
          <Card key={lyrics.id} className={classes.card}>
            <CardContent>
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
                <Box flex={1}>
                  <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 4 }}>
                    {lyrics.songTitle || translate('lyrics.moderation.unknownSong')}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body1" color="textSecondary">
                      {lyrics.songArtist || translate('lyrics.moderation.unknownArtist')}
                    </Typography>
                    <Chip
                      label={lyrics.language}
                      size="small"
                      className={classes.statusChip}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      ID: {lyrics.mediaFileId}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleCopyId(lyrics.mediaFileId)}
                      title={translate('lyrics.moderation.copyId')}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box className={classes.actions}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApprove(lyrics)}
                    disabled={processing}
                  >
                    {translate('lyrics.moderation.action.approve')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<RejectIcon />}
                    onClick={() => handleRejectClick(lyrics)}
                    disabled={processing}
                  >
                    {translate('lyrics.moderation.action.reject')}
                  </Button>
                </Box>
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                {translate('lyrics.moderation.submittedBy')}: <strong>{lyrics.createdByName || lyrics.createdBy}</strong>
                {' • '}
                {formatDate(lyrics.createdAt)}
              </Typography>

              <Box
                className={classes.lyricsPreview}
                onClick={() => handleView(lyrics)}
                title={translate('lyrics.moderation.clickToView')}
              >
                {lyrics.content.substring(0, 200)}
                {lyrics.content.length > 200 && '...'}
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>

      {/* View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {translate('lyrics.moderation.dialog.viewTitle')}
        </DialogTitle>
        <DialogContent>
          {selectedLyrics && (
            <>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {translate('lyrics.moderation.mediaFileId')}:{' '}
                {selectedLyrics.mediaFileId}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {translate('lyrics.field.language')}: {selectedLyrics.language}
              </Typography>
              <Divider style={{ margin: '16px 0' }} />
              <Box className={classes.lyricsFullView}>
                {selectedLyrics.content}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>
            {translate('ra.action.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialog}
        onClose={() => !processing && setRejectDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {translate('lyrics.moderation.dialog.rejectTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {translate('lyrics.moderation.dialog.rejectMessage')}
          </Typography>
          <TextField
            label={translate('lyrics.moderation.field.rejectNote')}
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            margin="normal"
            placeholder={translate(
              'lyrics.moderation.field.rejectNotePlaceholder',
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog(false)} disabled={processing}>
            {translate('ra.action.cancel')}
          </Button>
          <Button
            onClick={handleRejectConfirm}
            color="secondary"
            variant="contained"
            disabled={processing}
          >
            {processing ? (
              <CircularProgress size={24} />
            ) : (
              translate('lyrics.moderation.action.reject')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
