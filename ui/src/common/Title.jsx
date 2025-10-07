import React from 'react'
import { useMediaQuery } from '@material-ui/core'
import { useTranslate } from 'react-admin'
import { makeStyles } from '@material-ui/core/styles'
import Logo from '../icons/new-logo-no-bg-white.png'

const useStyles = makeStyles({
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
  },
})

export const Title = ({ subTitle, args }) => {
  const translate = useTranslate()
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'))
  const text = translate(subTitle, { ...args, _: subTitle })
  const classes = useStyles()

  if (isDesktop) {
    return (
      <span className={classes.titleContainer}>
        <img src={Logo} alt="Qırım Online" className={classes.logo} />
        <span className={classes.titleText}>Qırım Online{text ? ` - ${text}` : ''}</span>
      </span>
    )
  }
  return (
    <span className={classes.titleContainer}>
      <img src={Logo} alt="Qırım Online" className={classes.logo} />
      <span className={classes.titleText}>{text ? text : 'Qırım Online'}</span>
    </span>
  )
}
