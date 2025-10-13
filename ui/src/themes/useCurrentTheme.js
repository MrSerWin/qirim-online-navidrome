import { useSelector } from 'react-redux'
import useMediaQuery from '@material-ui/core/useMediaQuery'
import themes from './index'
import { AUTO_THEME_ID } from '../consts'
import config from '../config'
import { useEffect } from 'react'

const useCurrentTheme = () => {
  const prefersLightMode = useMediaQuery('(prefers-color-scheme: light)')
  const theme = useSelector((state) => {
    if (state.theme === AUTO_THEME_ID) {
      // return themes.NordTheme || Object.values(themes)[0]
      return prefersLightMode ? themes.QOLightTheme : themes.QODarkTheme
    }
    const themeName =
      Object.keys(themes).find((t) => t === state.theme) ||
      Object.keys(themes).find(
        (t) => themes[t].themeName === config.defaultTheme,
      ) ||
      'QODarkTheme'
    return themes[themeName] || themes.QODarkTheme || Object.values(themes)[0]
  })

  useEffect(() => {
    const styles = document.getElementsByTagName('style')
    let style
    for (let i = 0; i < styles.length; i++) {
      if (styles[i].id === 'nd-player-style-override') {
        style = styles[i]
      }
    }
    if (theme.player.stylesheet) {
      if (style === undefined) {
        style = document.createElement('style')
        style.id = 'nd-player-style-override'
        style.innerHTML = theme.player.stylesheet
        document.head.appendChild(style)
      } else {
        style.innerHTML = theme.player.stylesheet
      }
    } else {
      if (style !== undefined) {
        document.head.removeChild(style)
      }
    }
  }, [theme])

  return theme
}

export default useCurrentTheme
