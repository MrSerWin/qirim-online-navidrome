import React from 'react'
import { Route } from 'react-router-dom'
import Personal from './personal/Personal'
import ShopBrowser from './shop/ShopBrowser'
import ShopCheckout from './shop/ShopCheckout'
import Partners from './partners/Partners'
import About from './about/About'
import Privacy from './privacy/Privacy'
import Top from './top/Top'
import New from './new/New'
import Wrapped from './wrapped/Wrapped'
import WrappedPublicShare from './wrapped/WrappedPublicShare'
import config from './config'

const routes = [
  <Route exact path="/personal" render={() => <Personal />} key={'personal'} />,
  <Route exact path="/partners" render={() => <Partners />} key={'partners'} />,
  <Route exact path="/about" render={() => <About />} key={'about'} />,
  <Route exact path="/privacy" render={() => <Privacy />} key={'privacy'} />,
  <Route exact path="/top" render={() => <Top />} key={'top'} />,
  <Route exact path="/new" render={() => <New />} key={'new'} />,
  <Route exact path="/wrapped" render={() => <Wrapped />} key={'wrapped'} />,
  <Route exact path="/wrapped/share/:shareId" render={() => <WrappedPublicShare />} key={'wrapped-share'} />,
]

// Add shop routes if enabled
if (config.enableShop) {
  routes.push(
    <Route exact path="/shop" render={() => <ShopBrowser />} key={'shop'} />,
    <Route exact path="/shop/checkout" render={() => <ShopCheckout />} key={'shop-checkout'} />,
  )
}

export default routes
