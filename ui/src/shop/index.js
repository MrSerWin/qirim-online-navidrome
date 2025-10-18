import ShopBrowser from './ShopBrowser'
import ShopCheckout from './ShopCheckout'
import ShopCategoryList from './ShopCategoryList'
import ShopCategoryEdit from './ShopCategoryEdit'
import ShopCategoryCreate from './ShopCategoryCreate'
import ShopProductList from './ShopProductList'
import ShopProductEdit from './ShopProductEdit'
import ShopProductCreate from './ShopProductCreate'
import ShopOrderList from './ShopOrderList'

export default {
  ShopBrowser,
  ShopCheckout,
  list: ShopCategoryList,
  edit: ShopCategoryEdit,
  create: ShopCategoryCreate,
}

export const shopCategory = {
  list: ShopCategoryList,
  edit: ShopCategoryEdit,
  create: ShopCategoryCreate,
}

export const shopProduct = {
  list: ShopProductList,
  edit: ShopProductEdit,
  create: ShopProductCreate,
}

export const shopOrder = {
  list: ShopOrderList,
}
