import React, { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Badge,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Box,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart'
import AddShoppingCartIcon from '@material-ui/icons/AddShoppingCart'
import DeleteIcon from '@material-ui/icons/Delete'
import { useDataProvider, useNotify } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  categoryCard: {
    cursor: 'pointer',
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'scale(1.02)',
    },
  },
  productCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  productMedia: {
    height: 200,
    backgroundSize: 'contain',
  },
  productContent: {
    flexGrow: 1,
  },
  price: {
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    fontSize: '1.2rem',
  },
  cartButton: {
    position: 'fixed',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    zIndex: 1000,
  },
  drawer: {
    width: 400,
    padding: theme.spacing(2),
  },
  cartItem: {
    marginBottom: theme.spacing(1),
  },
  totalPrice: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginTop: theme.spacing(2),
  },
}))

const ShopBrowser = () => {
  const classes = useStyles()
  const dataProvider = useDataProvider()
  const notify = useNotify()

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('shopCart', JSON.stringify(cart))
  }, [cart])

  // Load categories
  useEffect(() => {
    dataProvider
      .getList('shop/category', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'sortOrder', order: 'ASC' },
      })
      .then(({ data }) => setCategories(data))
      .catch((error) => {
        console.error('Error loading categories:', error)
        notify('Error loading categories', { type: 'warning' })
      })
  }, [dataProvider, notify])

  // Load products
  useEffect(() => {
    const params = {
      pagination: { page: 1, perPage: 100 },
      sort: { field: 'sortOrder', order: 'ASC' },
    }

    if (selectedCategory) {
      params.filter = { categoryId: selectedCategory.id }
    }

    dataProvider
      .getList('shop/product', params)
      .then(({ data }) => setProducts(data))
      .catch((error) => {
        console.error('Error loading products:', error)
        notify('Error loading products', { type: 'warning' })
      })
  }, [dataProvider, notify, selectedCategory])

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
    notify('Added to cart', { type: 'info' })
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      )
    }
  }

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleCheckout = () => {
    // Redirect to checkout page (will be implemented)
    window.location.hash = '#/shop/checkout'
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        {selectedCategory ? selectedCategory.name : 'Shop'}
      </Typography>

      {!selectedCategory && (
        <>
          <Typography variant="h6" gutterBottom>
            Categories
          </Typography>
          <Grid container spacing={3}>
            {categories.map((category) => (
              <Grid item key={category.id} xs={12} sm={6} md={4}>
                <Card
                  className={classes.categoryCard}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category.imageUrl && (
                    <CardMedia
                      component="img"
                      height="140"
                      image={category.imageUrl}
                      alt={category.name}
                    />
                  )}
                  <CardContent>
                    <Typography variant="h6">{category.name}</Typography>
                    {category.description && (
                      <Typography variant="body2" color="textSecondary">
                        {category.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {selectedCategory && (
        <>
          <Button
            variant="outlined"
            onClick={() => setSelectedCategory(null)}
            style={{ marginBottom: 16 }}
          >
            ← Back to Categories
          </Button>
          <Grid container spacing={3}>
            {products.map((product) => (
              <Grid item key={product.id} xs={12} sm={6} md={4}>
                <Card className={classes.productCard}>
                  {product.imageUrl && (
                    <CardMedia
                      className={classes.productMedia}
                      image={product.imageUrl}
                      title={product.name}
                    />
                  )}
                  <CardContent className={classes.productContent}>
                    <Typography variant="h6" gutterBottom>
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="body2" color="textSecondary">
                        {product.description}
                      </Typography>
                    )}
                    <Typography className={classes.price}>
                      {product.price} {product.currency || 'USD'}
                    </Typography>
                    {product.inStock ? (
                      <Typography variant="caption" color="textSecondary">
                        In stock: {product.stockCount || 'Available'}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error">
                        Out of stock
                      </Typography>
                    )}
                  </CardContent>
                  <Box p={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<AddShoppingCartIcon />}
                      onClick={() => addToCart(product)}
                      disabled={!product.inStock}
                    >
                      Add to Cart
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Cart Button */}
      <IconButton
        className={classes.cartButton}
        color="primary"
        onClick={() => setCartOpen(true)}
      >
        <Badge badgeContent={getTotalItems()} color="secondary">
          <ShoppingCartIcon fontSize="large" />
        </Badge>
      </IconButton>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      >
        <div className={classes.drawer}>
          <Typography variant="h5" gutterBottom>
            Shopping Cart
          </Typography>
          <Divider />
          {cart.length === 0 ? (
            <Typography variant="body1" style={{ marginTop: 16 }}>
              Your cart is empty
            </Typography>
          ) : (
            <>
              <List>
                {cart.map((item) => (
                  <ListItem key={item.id} className={classes.cartItem}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.price} ${item.currency || 'USD'} x ${item.quantity}`}
                    />
                    <TextField
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(item.id, parseInt(e.target.value))
                      }
                      inputProps={{ min: 0, style: { width: 50 } }}
                      size="small"
                    />
                    <IconButton
                      onClick={() => removeFromCart(item.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
              <Divider />
              <Typography className={classes.totalPrice}>
                Total: {getTotalPrice().toFixed(2)}{' '}
                {cart[0]?.currency || 'USD'}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleCheckout}
                style={{ marginTop: 16 }}
              >
                Proceed to Checkout
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </div>
  )
}

export default ShopBrowser
