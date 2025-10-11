import stylesheet from './light.css.js'
import rajdhani from './fonts/rajdhani.css.js'

const bLight = {
  300: '#484848',
  500: '#ffffff',
  600: '#efefef',
}

// For Album, Playlist
const musicListActions = {
  alignItems: 'center',
  '@global': {
    'button:first-child:not(:only-child)': {
      '@media screen and (max-width: 720px)': {
        transform: 'scale(1.5)',
        margin: '1rem',
        '&:hover': {
          transform: 'scale(1.6) !important',
        },
      },
      transform: 'scale(2)',
      margin: '1.5rem',
      minWidth: 0,
      padding: 5,
      transition: 'transform .3s ease',
      backgroundColor: '#0085ff !important',
      color: '#fff',
      borderRadius: 500,
      border: 0,
      '&:hover': {
        transform: 'scale(2.1)',
        backgroundColor: '#0085ff !important',
        border: 0,
      },
    },
    'button:only-child': {
      margin: '1.5rem',
    },
    'button:first-child>span:first-child': {
      padding: 0,
    },
    'button:first-child>span:first-child>span': {
      display: 'none',
    },
    'button>span:first-child>span, button:not(:first-child)>span:first-child>svg':
      {
        color: 'rgba(0, 0, 0, 0.8)',
      },
  },
}

export default {
  themeName: 'QO Light',
  typography: {
    fontFamily: "Rajdhani, sans-serif",
  },
  palette: {
    secondary: {
      light: bLight['300'],
      dark: '#484848',
      main: '#fafafa',
      contrastText: '#fff',
    },
    type: 'light',
  },
  overrides: {
    '@global': rajdhani,
    MuiFormGroup: {
      root: {
        color: '#484848',
      },
    },
    MuiMenuItem: {
      root: {
        fontSize: '0.875rem',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingLeft: '10px',
        margin: '5px',
        borderRadius: '8px',
      },
    },
    MuiDivider: {
      root: {
        margin: '.75rem 0',
      },
    },
    MuiButton: {
      root: {
        backgroundColor: '#efefef !important',
        border: '1px solid transparent',
        borderRadius: 500,
        '&:hover': {
          backgroundColor: `${'#d0d0d0 !important'}`,
        },
      },
      label: {
        color: '#484848',
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
        color: '#484848',
      },
    },
    MuiDrawer: {
      root: {
        background: '#ffffff',
        paddingTop: '10px',
      },
    },
    MuiFilledInput: {
      root: {
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
        '&$disabled': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiList: {
      root: {
        color: '#484848',
        background: 'none',
      },
    },
    MuiListItem: {
      button: {
        transition: 'background-color .1s ease !important',
      },
    },
    MuiPaper: {
      root: {
        backgroundColor: '#ffffff',
      },
      rounded: {
        borderRadius: '8px',
      },
      elevation1: {
        boxShadow: 'none',
      },
    },
    MuiTableRow: {
      root: {
        color: '#484848',
        transition: 'background-color .3s ease',
        '&:hover': {
          backgroundColor: '#f5f5f5 !important',
        },
        '&:last-child': {
          borderBottom: '1px solid #efefef !important',
        },
      },
      head: {
        color: '#484848',
      },
    },
    MuiToolbar: {
      root: {
        backgroundColor: '#ffffff !important',
      },
    },
    MuiTableCell: {
      root: {
        borderBottom: 'none',
        color: '#484848 !important',
        padding: '10px !important',
      },
      head: {
        borderBottom: '1px solid #efefef',
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        backgroundColor: '#fafafa !important',
        color: '#484848 !important',
      },
      body: {
        color: '#484848 !important',
      },
    },
    MuiSwitch: {
      track: {
        width: '89%',
        transform: 'translateX(.1rem) scale(140%)',
        opacity: '0.7 !important',
        backgroundColor: 'rgba(0,0,0,0.25)',
      },
      thumb: {
        transform: 'scale(60%)',
        boxShadow: 'none',
      },
    },
    RaToolBar: {
      regular: {
        backgroundColor: 'none !important',
      },
    },
    MuiAppBar: {
      positionFixed: {
        backgroundColor: '#ffffff !important',
        boxShadow: 'none !important',
        borderBottom: `1px solid ${bLight['600']}`,
      },
      colorSecondary: {
        color: bLight['300'],
      },
    },
    MuiOutlinedInput: {
      root: {
        borderRadius: '8px',
        '&:hover': {
          borderColor: '#484848',
        },
      },
      notchedOutline: {
        transition: 'border-color .1s',
      },
    },
    MuiSelect: {
      select: {
        '&:focus': {
          borderRadius: '8px',
        },
      },
    },
    MuiChip: {
      root: {
        backgroundColor: '#efefef',
      },
    },
    NDAlbumGridView: {
      albumName: {
        marginTop: '0.5rem',
        fontWeight: 700,
        textTransform: 'none',
        color: '#000000',
      },
      albumSubtitle: {
        color: '#484848',
      },
      albumContainer: {
        border: '1px solid #d6d6d6 !important',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '0.75rem 0',
        transition: 'background-color .3s ease',
        '&:hover': {
          backgroundColor: '#f5f5f5',
        },
      },
      albumPlayButton: {
        backgroundColor: '#0085ff',
        borderRadius: '50%',
        boxShadow: '0 8px 8px rgb(0 0 0 / 30%)',
        padding: '0.35rem',
        transition: 'padding .3s ease',
        '&:hover': {
          background: `${'#0085ff'} !important`,
          padding: '0.45rem',
        },
      },
    },
    NDPlaylistDetails: {
      container: {
        borderRadius: 0,
        paddingTop: '2.5rem !important',
        boxShadow: 'none',
      },
      title: {
        fontSize: 'calc(1.5rem + 1.5vw);',
        fontWeight: 700,
        color: '#000',
      },
      details: {
        fontSize: '.875rem',
        color: 'rgba(0,0,0, 0.8)',
      },
    },
    NDAlbumShow: {
      albumActions: musicListActions,
    },
    NDPlaylistShow: {
      playlistActions: musicListActions,
    },
    NDAlbumDetails: {
      root: {
        background: '#ffffff',
        borderRadius: 0,
        boxShadow: '0 8px 8px rgb(0 0 0 / 20%)',
      },
      cardContents: {
        alignItems: 'center',
        paddingTop: '1.5rem',
      },
      recordName: {
        fontSize: 'calc(1rem + 1.5vw);',
        fontWeight: 700,
      },
      recordArtist: {
        fontSize: '.875rem',
        fontWeight: 700,
      },
      recordMeta: {
        fontSize: '.875rem',
        color: 'rgba(0,0,0, 0.8)',
      },
    },
    NDCollapsibleComment: {
      commentBlock: {
        fontSize: '.875rem',
        color: 'rgba(0,0,0, 0.8)',
      },
    },
    NDAudioPlayer: {
      audioTitle: {
        color: '#484848',
        fontSize: '0.875rem',
      },
      songTitle: {
        fontWeight: 400,
      },
      songInfo: {
        fontSize: '0.675rem',
        color: '#484848',
      },
      player: {
        border: '10px solid #ffffff',
        backgroundColor: '#ffffff !important',
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
        minWidth: 400,
        marginTop: '6em',
        backgroundColor: '#f3f3f3e6',
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
    NDSubMenu: {
      sidebarIsClosed: {
        '& a': {
          paddingLeft: '10px',
        },
      },
    },
    NDMobileArtistDetails: {
      bgContainer: {
        background:
          'linear-gradient(to bottom, rgb(255 255 255 / 51%), rgb(250 250 250))!important',
      },
    },
    RaLayout: {
      content: {
        padding: '0 !important',
        background: '#fafafa',
        backgroundColor: '#fafafa',
      },
      root: {
        backgroundColor: '#ffffff',
      },
    },
    RaList: {
      content: {
        backgroundColor: '#ffffff',
        borderRadius: '0px',
      },
    },
    RaListToolbar: {
      toolbar: {
        backgroundColor: '#ffffff',
        padding: '0 .55rem !important',
      },
    },
    RaSidebar: {
      fixed: {
        backgroundColor: '#ffffff',
      },
      drawerPaper: {
        backgroundColor: '#ffffff !important',
      },
    },
    RaSearchInput: {
      input: {
        paddingLeft: '.9rem',
        marginTop: '36px',
        border: 0,
      },
    },
    RaDatagrid: {
      headerCell: {
        '&:first-child': {
          borderTopLeftRadius: '0px !important',
        },
        '&:last-child': {
          borderTopRightRadius: '0px !important',
        },
      },
    },
    RaButton: {
      button: {
        margin: '0 5px 0 5px',
      },
    },
    RaLink: {
      link: {
        color: '#0085ff',
      },
    },
    RaPaginationActions: {
      currentPageButton: {
        border: '2px solid rgba(0,0,0,0.25)',
      },
      button: {
        backgroundColor: '#efefef',
        minWidth: 48,
        margin: '0 4px',
        '@global': {
          '> .MuiButton-label': {
            padding: 0,
          },
        },
      },
      actions: {
        '@global': {
          '.next-page': {
            marginLeft: 8,
            marginRight: 8,
          },
          '.previous-page': {
            marginRight: 8,
          },
        },
      },
    },
  },
  player: {
    theme: 'light',
    stylesheet,
  },
}
