import React, { useState } from 'react'
import { IconButton, Tooltip } from '@material-ui/core'
import { Subject as LyricsIcon } from '@material-ui/icons'
import { useTranslate } from 'react-admin'
import { LyricsDialog } from './LyricsDialog'

export const LyricsButton = ({ record }) => {
  const translate = useTranslate()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!record || !record.id) {
    return null
  }

  return (
    <>
      <Tooltip title={translate('lyrics.action.addEdit')}>
        <IconButton onClick={() => setDialogOpen(true)} size="small">
          <LyricsIcon />
        </IconButton>
      </Tooltip>
      <LyricsDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mediaFileId={record.id}
        songTitle={record.title}
      />
    </>
  )
}
