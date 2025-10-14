window.global = window // fix "global is not defined" error in react-image-lightbox

import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
// Register Service Worker with scope '/' to intercept all requests
if ('serviceWorker' in navigator) {
  // If a dev service worker (dev-sw.js) is present (from vite/dev), unregister it
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      regs.forEach((r) => {
        try {
          if (
            r &&
            r.active &&
            r.active.scriptURL &&
            r.active.scriptURL.includes('dev-sw.js')
          ) {
            r.unregister().catch(() => {})
          }
        } catch (e) {
          // ignore
        }
      })
    })
    .catch(() => {})

  navigator.serviceWorker
    .register('/app/sw.js', { scope: '/' })
    .then((registration) => {
      /* eslint-disable-next-line no-console */
      console.log('SW registered with scope:', registration.scope)
    })
    .catch((error) => {
      /* eslint-disable-next-line no-console */
      console.error('SW registration failed:', error)
    })
}

ReactDOM.render(<App />, document.getElementById('root'))
