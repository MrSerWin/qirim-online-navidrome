import React, { lazy, Suspense } from 'react'
import { Route } from 'react-router-dom'
import { Loading } from 'react-admin'
import config from './config'

// Lazy load route components to reduce initial bundle size
const Personal = lazy(() => import('./personal/Personal'))
const ShopBrowser = lazy(() => import('./shop/ShopBrowser'))
const ShopCheckout = lazy(() => import('./shop/ShopCheckout'))
const Partners = lazy(() => import('./partners/Partners'))
const About = lazy(() => import('./about/About'))
const Privacy = lazy(() => import('./privacy/Privacy'))

// Wrapper component to handle lazy loading with suspense
const LazyRoute = ({ component: Component, ...rest }) => (
  <Suspense fallback={<Loading />}>
    <Component {...rest} />
  </Suspense>
)

const routes = [
  <Route exact path="/personal" render={(props) => <LazyRoute component={Personal} {...props} />} key={'personal'} />,
  <Route exact path="/partners" render={(props) => <LazyRoute component={Partners} {...props} />} key={'partners'} />,
  <Route exact path="/about" render={(props) => <LazyRoute component={About} {...props} />} key={'about'} />,
  <Route exact path="/privacy" render={(props) => <LazyRoute component={Privacy} {...props} />} key={'privacy'} />,
]

// Add shop routes if enabled
if (config.enableShop) {
  routes.push(
    <Route exact path="/shop" render={(props) => <LazyRoute component={ShopBrowser} {...props} />} key={'shop'} />,
    <Route exact path="/shop/checkout" render={(props) => <LazyRoute component={ShopCheckout} {...props} />} key={'shop-checkout'} />,
  )
}

export default routes
