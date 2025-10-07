window.global = window // fix "global is not defined" error in react-image-lightbox

import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
// Register Service Worker with scope '/' to intercept all requests
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/app/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('SW registered with scope:', registration.scope)
    })
    .catch((error) => {
      console.error('SW registration failed:', error)
    })
}

ReactDOM.render(<App />, document.getElementById('root'))
