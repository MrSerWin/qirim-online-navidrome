import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  makeStyles,
  Container,
  Card,
  CardContent,
} from '@material-ui/core'
import { useTranslate, useDataProvider, useNotify, Title as PageTitle } from 'react-admin'
import { Title } from '../common/Title'
import WrappedSlides from './WrappedSlides'
import config from '../config'
import { httpClient } from '../dataProvider'

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    background: '#202021',
    // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: theme.spacing(4, 2),
  },
  container: {
    maxWidth: 800,
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: theme.spacing(4),
  },
  title: {
    fontSize: '3rem',
    fontWeight: 700,
    marginBottom: theme.spacing(2),
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  subtitle: {
    fontSize: '1.2rem',
    opacity: 0.9,
  },
  yearSelector: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(4),
    flexWrap: 'wrap',
  },
  yearButton: {
    minWidth: 120,
    fontSize: '1.2rem',
    padding: theme.spacing(1.5, 3),
    borderRadius: theme.spacing(3),
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
      border: '2px solid rgba(255, 255, 255, 0.5)',
    },
  },
  selectedYear: {
    background: 'white',
    color: '#667eea',
    border: '2px solid white',
    '&:hover': {
      background: 'white',
      color: '#667eea',
    },
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
    color: 'white',
  },
  noData: {
    textAlign: 'center',
    color: 'white',
    padding: theme.spacing(4),
  },
  noDataCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.spacing(2),
    padding: theme.spacing(4),
  },
  noDataText: {
    fontSize: '1.2rem',
    marginBottom: theme.spacing(2),
  },
}))

const Wrapped = () => {
  const classes = useStyles()
  const translate = useTranslate()
  const dataProvider = useDataProvider()
  const notify = useNotify()
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)
  const [wrappedData, setWrappedData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)

  // Fetch available years on mount
  useEffect(() => {
    fetchAvailableYears()
  }, [])

  const fetchAvailableYears = async () => {
    try {
      setLoading(true)
      const { json } = await httpClient('/api/wrapped/available-years')

      setAvailableYears(json.years || [])

      // Auto-select most recent year
      if (json.years && json.years.length > 0) {
        setSelectedYear(json.years[0])
      }
    } catch (error) {
      notify('error.wrapped.fetchYears', 'error')
      console.error('Error fetching years:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWrappedStats = async (year) => {
    try {
      setLoadingStats(true)
      const { json } = await httpClient(`/api/wrapped/${year}?period=year`)
      setWrappedData(json)
    } catch (error) {
      notify('error.wrapped.fetchStats', 'error')
      console.error('Error fetching stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    if (selectedYear) {
      fetchWrappedStats(selectedYear)
    }
  }, [selectedYear])

  if (loading) {
    return (
      <Box className={classes.root}>
        <Container className={classes.container}>
          <Box className={classes.loading}>
            <CircularProgress size={60} style={{ color: 'white' }} />
          </Box>
        </Container>
      </Box>
    )
  }

  if (availableYears.length === 0) {
    return (
      <Box className={classes.root}>
        <Container className={classes.container}>
          <Box className={classes.header}>
            <Typography className={classes.title}>
              🎵 {translate('wrapped.title')}
            </Typography>
            <Typography className={classes.subtitle}>
              {translate('wrapped.subtitle')}
            </Typography>
          </Box>

          <Box className={classes.noData}>
            <Card className={classes.noDataCard}>
              <CardContent>
                <Typography className={classes.noDataText}>
                  {translate('wrapped.noData')}
                </Typography>
                <Typography variant="body2" style={{ opacity: 0.8 }}>
                  {translate('wrapped.noDataHint')}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>
    )
  }

  return (
    <>
      <PageTitle title={<Title subTitle={translate('menu.wrapped.name')} />} />
      <Box className={classes.root}>
        <Container className={classes.container}>
          <Box className={classes.header}>
            <Typography className={classes.title}>
              🎵 {translate('wrapped.title')}
            </Typography>
            <Typography className={classes.subtitle}>
              {translate('wrapped.subtitle')}
            </Typography>
          </Box>

        <Box className={classes.yearSelector}>
          {availableYears.map((year) => (
            <Button
              key={year}
              className={`${classes.yearButton} ${
                selectedYear === year ? classes.selectedYear : ''
              }`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Button>
          ))}
        </Box>

        {loadingStats ? (
          <Box className={classes.loading}>
            <CircularProgress size={60} style={{ color: 'white' }} />
          </Box>
        ) : wrappedData ? (
          <WrappedSlides data={wrappedData} year={selectedYear} />
        ) : null}
      </Container>
    </Box>
    </>
  )
}

export default Wrapped
