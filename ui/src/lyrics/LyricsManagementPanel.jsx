import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  CircularProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@material-ui/core'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
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
    flexWrap: 'wrap',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: theme.spacing(4),
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  statusChip: {
    fontWeight: 600,
  },
}))

export const LyricsManagementPanel = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const notify = useNotify()
  const [approvedLyrics, setApprovedLyrics] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [viewDialog, setViewDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [selectedLyrics, setSelectedLyrics] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editLanguage, setEditLanguage] = useState('')
  const [changeNote, setChangeNote] = useState('')

  useEffect(() => {
    loadApprovedLyrics()
  }, [])

  const loadApprovedLyrics = async () => {
    setLoading(true)
    try {
      const response = await lyricsApi.getAllApproved(100, 0)
      setApprovedLyrics(response.data || [])
      setTotal(response.total || 0)
    } catch (err) {
      console.error('Error loading approved lyrics:', err)
      notify(translate('lyrics.management.loadError'), { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleView = (lyrics) => {
    setSelectedLyrics(lyrics)
    setViewDialog(true)
  }

  const handleEditClick = (lyrics) => {
    setSelectedLyrics(lyrics)
    setEditContent(lyrics.content)
    setEditLanguage(lyrics.language || 'crh')
    setChangeNote('')
    setEditDialog(true)
  }

  const handleEdit = async () => {
    if (!selectedLyrics || !editContent.trim()) {
      notify(translate('lyrics.management.contentRequired'), { type: 'warning' })
      return
    }

    setProcessing(true)
    try {
      await lyricsApi.update(selectedLyrics.id, {
        content: editContent,
        language: editLanguage,
        changeNote: changeNote || 'Updated via admin panel',
      })
      notify(translate('lyrics.management.updated'), { type: 'success' })
      setEditDialog(false)
      loadApprovedLyrics()
    } catch (err) {
      console.error('Error updating lyrics:', err)
      notify(translate('lyrics.management.updateError'), { type: 'error' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteClick = (lyrics) => {
    setSelectedLyrics(lyrics)
    setDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!selectedLyrics) return

    setProcessing(true)
    try {
      await lyricsApi.delete(selectedLyrics.id)
      notify(translate('lyrics.management.deleted'), { type: 'success' })
      setDeleteDialog(false)
      loadApprovedLyrics()
    } catch (err) {
      console.error('Error deleting lyrics:', err)
      notify(translate('lyrics.management.deleteError'), { type: 'error' })
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

  if (approvedLyrics.length === 0) {
    return (
      <Card className={classes.card}>
        <CardContent>
          <Box className={classes.emptyState}>
            <Typography variant="h6">
              {translate('lyrics.management.noApproved')}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {translate('lyrics.management.subtitle', { count: total })}
      </Typography>

      <List>
        {approvedLyrics.map((lyrics) => (
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
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => handleView(lyrics)}
                  >
                    {translate('lyrics.management.view')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(lyrics)}
                    disabled={processing}
                  >
                    {translate('lyrics.management.edit')}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(lyrics)}
                    disabled={processing}
                  >
                    {translate('lyrics.management.delete')}
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
          {translate('lyrics.title')}
          {selectedLyrics && selectedLyrics.songTitle && `: ${selectedLyrics.songTitle}`}
        </DialogTitle>
        <DialogContent>
          {selectedLyrics && (
            <Box className={classes.lyricsFullView}>
              {selectedLyrics.content}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)} color="primary">
            {translate('ra.action.close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog}
        onClose={() => !processing && setEditDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {translate('lyrics.management.editTitle')}
          {selectedLyrics && selectedLyrics.songTitle && `: ${selectedLyrics.songTitle}`}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={translate('lyrics.management.content')}
            multiline
            rows={10}
            fullWidth
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            variant="outlined"
            margin="normal"
            required
          />
          <TextField
            label={translate('lyrics.management.language')}
            fullWidth
            value={editLanguage}
            onChange={(e) => setEditLanguage(e.target.value)}
            variant="outlined"
            margin="normal"
          />
          <TextField
            label={translate('lyrics.management.changeNote')}
            fullWidth
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            variant="outlined"
            margin="normal"
            helperText={translate('lyrics.management.changeNoteHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)} disabled={processing}>
            {translate('ra.action.cancel')}
          </Button>
          <Button
            onClick={handleEdit}
            color="primary"
            variant="contained"
            disabled={processing || !editContent.trim()}
          >
            {processing
              ? translate('lyrics.management.saving')
              : translate('ra.action.save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog}
        onClose={() => !processing && setDeleteDialog(false)}
        maxWidth="sm"
      >
        <DialogTitle>{translate('lyrics.management.deleteConfirmTitle')}</DialogTitle>
        <DialogContent>
          <Typography>
            {translate('lyrics.management.deleteConfirm')}
          </Typography>
          {selectedLyrics && (
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                <strong>{translate('lyrics.management.song')}:</strong> {selectedLyrics.songTitle || translate('lyrics.moderation.unknownSong')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>{translate('lyrics.management.artist')}:</strong> {selectedLyrics.songArtist || translate('lyrics.moderation.unknownArtist')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={processing}>
            {translate('ra.action.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            color="secondary"
            variant="contained"
            disabled={processing}
          >
            {processing
              ? translate('lyrics.management.deleting')
              : translate('ra.action.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
