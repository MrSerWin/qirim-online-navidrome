import stylesheet from './light.css.js'
import rajdhani from './fonts/rajdhani.css.js'
const bLight = {
  300: '#484848',
  500: '#ffffff',
  600: '#efefef',
}
export default {
  themeName: 'Light',
  typography: {
    fontFamily: 'Rajdhani, sans-serif',
  },
  palette: {
    secondary: {
      light: bLight['300'],
      dark: '#484848',
      main: '#fafafa',
      contrastText: '#fff',
    },
  },
  overrides: {
    '@global': rajdhani,
    MuiFilledInput: {
      root: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        '&$disabled': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      },
    },

    MuiAppBar: {
      positionFixed: {
        // background: `${bLight['500']} !important`,
        boxShadow: 'none !important',
        borderBottom: `1px solid ${bLight['600']}`,
      },
      colorSecondary: {
        color: bLight['300'],
      },
    },
    NDLogin: {
      main: {
        '& .MuiFormLabel-root': {
          color: '#000000',
        },
        '& .MuiFormLabel-root.Mui-focused': {
          color: '#0085ff',
        },
        '& .MuiFormLabel-root.Mui-error': {
          color: '#f44336',
        },
        '& .MuiInput-underline:after': {
          borderBottom: '2px solid #0085ff',
        },
      },
      card: {
        minWidth: 300,
        marginTop: '6em',
        backgroundColor: '#ffffffe6',
      },
      avatar: {},
      icon: {},
      button: {
        boxShadow: '3px 3px 5px #000000a3',
      },
      systemNameLink: {
        color: '#0085ff',
      },
    },
    NDMobileArtistDetails: {
      bgContainer: {
        background:
          'linear-gradient(to bottom, rgb(255 255 255 / 51%), rgb(250 250 250))!important',
      },
    },
  },
  player: {
    theme: 'light',
    stylesheet,
  },

  MuiButton: {
    root: {
      backgroundColor: '#4C566A !important',
      border: '1px solid transparent',
      borderRadius: 500,
      '&:hover': {
        backgroundColor: `${'#5E81AC !important'}`,
      },
    },
    label: {
      color: 'red',
      paddingRight: '1rem',
      paddingLeft: '0.7rem',
    },
    contained: {
      boxShadow: 'none',
      '&:hover': {
        boxShadow: 'none',
      },
    },
  },
  MuiIconButton: {
    label: {
      color: 'red',
    },
  },
}
