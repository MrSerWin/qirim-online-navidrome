import React from 'react'
import { useMediaQuery } from '@material-ui/core'
import { useTranslate } from 'react-admin'
import { useSelector } from 'react-redux'

import { makeStyles } from '@material-ui/core/styles'
// import LogoLight from '../icons/new-logo-no-bg-white.png'
// import LogoDark from '../icons/new-logo-no-bg.png';
import LogoLight from '../icons/qo-logo.png'
import LogoDark from '../icons/qo-logo-dark.png';
import { AUTO_THEME_ID } from '../consts'

const useStyles = makeStyles(
  (theme) => ({
  logo: {
    height: '50px',
    width: 'auto',
    marginRight: '8px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  },
  titleText: {
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    color: theme.palette.text.primary,
  },
}))

export const Title = ({ subTitle, args }) => {
  const translate = useTranslate()
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  const text = translate(subTitle, { ...args, _: subTitle })
  const classes = useStyles();

  const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)')

  const logo = useSelector((state) => {
    if (state.theme === AUTO_THEME_ID) {
      return prefersLightMode ? LogoDark : LogoLight;
    }

    if (state.theme === 'LigeraTheme' || state.theme === 'LightTheme' || state.theme === 'QOLightTheme') {
      return LogoDark;
    }

    return LogoLight;
  })

  if (isDesktop) {
    return (
      <span className={classes.titleContainer}>
        <img src={logo} alt="Qırım Online" className={classes.logo} />
        <span className={classes.titleText}>Qırım Online{text ? ` - ${text}` : ''}</span>
      </span>
    )
  }
  return (
    <span className={classes.titleContainer}>
      <img src={logo} alt="Qırım Online" className={classes.logo} />
      <span className={classes.titleText}>{text ? text : 'Qırım Online'}</span>
    </span>
  )
}
