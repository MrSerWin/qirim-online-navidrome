import React, { useState } from 'react'
import { Box, Typography, Tabs, Tab } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { useTranslate, Title as PageTitle } from 'react-admin'
import { Title } from '../common/Title'
import { LyricsModerationPanel } from './LyricsModerationPanel'
import { LyricsManagementPanel } from './LyricsManagementPanel'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 1.5),
    },
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    color: theme.palette.text.primary,
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.4rem',
      marginBottom: theme.spacing(1.5),
    },
  },
  tabs: {
    marginBottom: theme.spacing(3),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}))

export const LyricsModerationPage = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const [activeTab, setActiveTab] = useState(0)

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
  }

  return (
    <Box className={classes.root}>
      <PageTitle title={<Title subTitle={translate('lyrics.moderation.title')} />} />

      <Typography className={classes.sectionTitle}>
        {translate('lyrics.moderation.title')}
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        className={classes.tabs}
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab label={translate('lyrics.moderation.pendingTab')} />
        <Tab label={translate('lyrics.moderation.approvedTab')} />
      </Tabs>

      {activeTab === 0 && <LyricsModerationPanel />}
      {activeTab === 1 && <LyricsManagementPanel />}
    </Box>
  )
}

export default LyricsModerationPage
