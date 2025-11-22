import React from 'react'
import { Box, Container, Typography, Button } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import WrappedSlides from './WrappedSlides'

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: '100vh',
    background: '#202021',
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
  controls: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    '&:hover': {
      background: 'rgba(255, 255, 255, 0.3)',
    },
  },
}))

const WrappedTestPage = () => {
  const classes = useStyles()
  const [testData, setTestData] = React.useState('normal')

  const testDataSets = {
    threshold: {
      totalMinutes: 599, // Ровно < 600 минут (показать минуты)
      totalTracks: 123,
      uniqueArtists: 45,
      uniqueAlbums: 67,
      topTracks: [
        { id: '1', title: 'Test 1', artist: 'Artist 1', playCount: 10 },
        { id: '2', title: 'Test 2', artist: 'Artist 2', playCount: 8 },
      ],
      topArtists: [
        { id: '1', name: 'Artist 1', playCount: 50, minutesPlayed: 100 },
        { id: '2', name: 'Artist 2', playCount: 40, minutesPlayed: 80 },
      ],
      topAlbums: [
        { id: '1', name: 'Album 1', artist: 'Artist 1', playCount: 30 },
      ],
      topPercentile: 75,
    },
    hoursTest: {
      totalMinutes: 2880, // Ровно 48 часов (показать часы)
      totalTracks: 456,
      uniqueArtists: 78,
      uniqueAlbums: 90,
      topTracks: [
        { id: '1', title: 'Test 1', artist: 'Artist 1', playCount: 100 },
        { id: '2', title: 'Test 2', artist: 'Artist 2', playCount: 85 },
      ],
      topArtists: [
        { id: '1', name: 'Artist 1', playCount: 500, minutesPlayed: 1000 },
        { id: '2', name: 'Artist 2', playCount: 400, minutesPlayed: 800 },
      ],
      topAlbums: [
        { id: '1', name: 'Album 1', artist: 'Artist 1', playCount: 300 },
      ],
      topPercentile: 85,
    },
    daysTest: {
      totalMinutes: 2881, // > 48 hours (показать дни)
      totalTracks: 789,
      uniqueArtists: 123,
      uniqueAlbums: 145,
      topTracks: [
        { id: '1', title: 'Test 1', artist: 'Artist 1', playCount: 200 },
        { id: '2', title: 'Test 2', artist: 'Artist 2', playCount: 185 },
      ],
      topArtists: [
        { id: '1', name: 'Artist 1', playCount: 1000, minutesPlayed: 2000 },
        { id: '2', name: 'Artist 2', playCount: 900, minutesPlayed: 1800 },
      ],
      topAlbums: [
        { id: '1', name: 'Album 1', artist: 'Artist 1', playCount: 600 },
      ],
      topPercentile: 90,
    },
    normal: {
      totalMinutes: 1234, // ~20 hours (показать в минутах, < 600)
      totalTracks: 567,
      uniqueArtists: 89,
      uniqueAlbums: 123,
      topTracks: [
        { id: '1', title: 'Qırım Yırları', artist: 'Seyran Hajibeyli', playCount: 45 },
        { id: '2', title: 'Anavtan', artist: 'Enver Baltayev', playCount: 38 },
        { id: '3', title: 'Ana Yurt', artist: 'Crimean Ensemble', playCount: 32 },
      ],
      topArtists: [
        { id: '1', name: 'Seyran Hajibeyli', playCount: 145 },
        { id: '2', name: 'Enver Baltayev', playCount: 128 },
        { id: '3', name: 'Crimean Ensemble', playCount: 98 },
      ],
      topAlbums: [
        { id: '1', name: 'Qırım Music', artist: 'Various Artists', playCount: 67 },
        { id: '2', name: 'Traditional Songs', artist: 'Folk Artists', playCount: 54 },
      ],
      topPercentile: 85,
    },
    large: {
      totalMinutes: 12345, // ~205 hours / ~8 days (показать в часах)
      totalTracks: 5678,
      uniqueArtists: 234,
      uniqueAlbums: 456,
      topTracks: [
        { id: '1', title: 'Qırım Yırları', artist: 'Seyran Hajibeyli', playCount: 1234 },
        { id: '2', title: 'Anavtan', artist: 'Enver Baltayev', playCount: 987 },
        { id: '3', title: 'Ana Yurt', artist: 'Crimean Ensemble', playCount: 876 },
      ],
      topArtists: [
        { id: '1', name: 'Seyran Hajibeyli', playCount: 3456 },
        { id: '2', name: 'Enver Baltayev', playCount: 2987 },
        { id: '3', name: 'Crimean Ensemble', playCount: 2543 },
      ],
      topAlbums: [
        { id: '1', name: 'Qırım Music', artist: 'Various Artists', playCount: 1876 },
        { id: '2', name: 'Traditional Songs', artist: 'Folk Artists', playCount: 1543 },
      ],
      topPercentile: 95,
    },
    veryLarge: {
      totalMinutes: 123456, // ~2057 hours / ~85 days (показать в днях)
      totalTracks: 98765, // ~98K
      uniqueArtists: 1234, // ~1.2K
      uniqueAlbums: 2345, // ~2.3K
      topTracks: [
        { id: '1', title: 'Qırım Yırları', artist: 'Seyran Hajibeyli', playCount: 12345 },
        { id: '2', title: 'Anavtan', artist: 'Enver Baltayev', playCount: 9876 },
        { id: '3', title: 'Ana Yurt', artist: 'Crimean Ensemble', playCount: 8765 },
      ],
      topArtists: [
        { id: '1', name: 'Seyran Hajibeyli', playCount: 34567 },
        { id: '2', name: 'Enver Baltayev', playCount: 29876 },
        { id: '3', name: 'Crimean Ensemble', playCount: 25432 },
      ],
      topAlbums: [
        { id: '1', name: 'Qırım Music', artist: 'Various Artists', playCount: 18765 },
        { id: '2', name: 'Traditional Songs', artist: 'Folk Artists', playCount: 15432 },
      ],
      topPercentile: 99,
    },
    extreme: {
      totalMinutes: 1234567, // ~20576 hours / ~857 days (показать в днях)
      totalTracks: 987654, // ~987K
      uniqueArtists: 12345, // ~12.3K
      uniqueAlbums: 23456, // ~23.4K
      topTracks: [
        { id: '1', title: 'Qırım Yırları', artist: 'Seyran Hajibeyli', playCount: 123456 },
        { id: '2', title: 'Anavtan', artist: 'Enver Baltayev', playCount: 98765 },
        { id: '3', title: 'Ana Yurt', artist: 'Crimean Ensemble', playCount: 87654 },
      ],
      topArtists: [
        { id: '1', name: 'Seyran Hajibeyli', playCount: 345678 },
        { id: '2', name: 'Enver Baltayev', playCount: 298765 },
        { id: '3', name: 'Crimean Ensemble', playCount: 254321 },
      ],
      topAlbums: [
        { id: '1', name: 'Qırım Music', artist: 'Various Artists', playCount: 187654 },
        { id: '2', name: 'Traditional Songs', artist: 'Folk Artists', playCount: 154321 },
      ],
      topPercentile: 99.9,
    },
  }

  return (
    <Box className={classes.root}>
      <Container className={classes.container}>
        <Box className={classes.header}>
          <Typography variant="h3" style={{ marginBottom: 16 }}>
            🧪 Wrapped Test Page
          </Typography>
          <Typography variant="body1" style={{ opacity: 0.8 }}>
            Test how numbers look with different data sizes
          </Typography>
        </Box>

        <Box className={classes.controls}>
          <Button
            className={classes.button}
            variant={testData === 'threshold' ? 'contained' : 'outlined'}
            onClick={() => setTestData('threshold')}
          >
            Threshold (599 min)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'hoursTest' ? 'contained' : 'outlined'}
            onClick={() => setTestData('hoursTest')}
          >
            Hours (48 hrs)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'daysTest' ? 'contained' : 'outlined'}
            onClick={() => setTestData('daysTest')}
          >
            Days (&gt;48 hrs)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'normal' ? 'contained' : 'outlined'}
            onClick={() => setTestData('normal')}
          >
            Normal (1K)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'large' ? 'contained' : 'outlined'}
            onClick={() => setTestData('large')}
          >
            Large (10K)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'veryLarge' ? 'contained' : 'outlined'}
            onClick={() => setTestData('veryLarge')}
          >
            Very Large (100K)
          </Button>
          <Button
            className={classes.button}
            variant={testData === 'extreme' ? 'contained' : 'outlined'}
            onClick={() => setTestData('extreme')}
          >
            Extreme (1M)
          </Button>
        </Box>

        <WrappedSlides
          data={testDataSets[testData]}
          year={2024}
          showShareButton={false}
        />
      </Container>
    </Box>
  )
}

export default WrappedTestPage
