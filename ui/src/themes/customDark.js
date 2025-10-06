import stylesheet from './customDark.css.js'

export default {
  themeName: 'Custom Dark (myQO)',
  palette: {
    primary: {
      main: '#e94560',
      light: '#ff6b9d',
      dark: '#c72c48',
    },
    secondary: {
      main: '#0f3460',
      light: '#1a4d7a',
      dark: '#0a2847',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#b0b0b0',
    },
    type: 'dark',
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  overrides: {
    MuiAppBar: {
      colorPrimary: {
        backgroundColor: '#16213e',
      },
    },
    MuiPaper: {
      root: {
        backgroundColor: '#16213e',
      },
    },
    MuiCard: {
      root: {
        backgroundColor: '#0f3460',
        '&:hover': {
          backgroundColor: '#1a4d7a',
        },
      },
    },
    MuiFormGroup: {
      root: {
        color: '#f5f5f5',
      },
    },
    NDLogin: {
      systemNameLink: {
        color: '#e94560',
      },
      icon: {},
      welcome: {
        color: '#f5f5f5',
      },
      card: {
        minWidth: 300,
        backgroundColor: '#16213eed',
        boxShadow: '0 8px 32px 0 rgba(233, 69, 96, 0.2)',
      },
      avatar: {},
      button: {
        backgroundColor: '#e94560',
        color: '#ffffff',
        '&:hover': {
          backgroundColor: '#ff6b9d',
        },
        boxShadow: '3px 3px 15px #e9456055',
      },
    },
    NDMobileArtistDetails: {
      bgContainer: {
        background:
          'linear-gradient(to bottom, rgba(26 26 46 / 90%), rgb(22 33 62))!important',
      },
    },
  },
  player: {
    theme: 'dark',
    stylesheet,
  },
}
