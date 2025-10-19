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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart'
import AddShoppingCartIcon from '@material-ui/icons/AddShoppingCart'
import DeleteIcon from '@material-ui/icons/Delete'
import SearchIcon from '@material-ui/icons/Search'
import FilterListIcon from '@material-ui/icons/FilterList'
import { useDataProvider, useNotify } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  searchSection: {
    marginBottom: theme.spacing(3),
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  searchField: {
    minWidth: 300,
  },
  categoryFilter: {
    minWidth: 200,
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
  activeCategory: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  categoryChip: {
    margin: theme.spacing(0.5),
  },
  noResults: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}))

const MerchBrowser = () => {
  const classes = useStyles()
  const dataProvider = useDataProvider()
  const notify = useNotify()

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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
    setLoading(true)
    const params = {
      pagination: { page: 1, perPage: 1000 }, // Load more products for search
      sort: { field: 'sortOrder', order: 'ASC' },
    }

    dataProvider
      .getList('shop/product', params)
      .then(({ data }) => {
        setProducts(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading products:', error)
        notify('Error loading products', { type: 'warning' })
        setLoading(false)
      })
  }, [dataProvider, notify])

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory.id)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }, [products, selectedCategory, searchQuery])

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

  const clearFilters = () => {
    setSelectedCategory(null)
    setSearchQuery('')
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Unknown Category'
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h4" gutterBottom>
          Наш Мерч
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Откройте для себя уникальные товары и аксессуары
        </Typography>
      </div>

      {/* Search and Filter Section */}
      <div className={classes.searchSection}>
        <TextField
          className={classes.searchField}
          placeholder="Поиск товаров..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl className={classes.categoryFilter}>
          <InputLabel>Категория</InputLabel>
          <Select
            value={selectedCategory?.id || ''}
            onChange={(e) => {
              const category = categories.find(cat => cat.id === e.target.value)
              setSelectedCategory(category || null)
            }}
          >
            <MenuItem value="">
              <em>Все категории</em>
            </MenuItem>
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(selectedCategory || searchQuery) && (
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={clearFilters}
          >
            Очистить фильтры
          </Button>
        )}
      </div>

      {/* Category Chips */}
      {!selectedCategory && !searchQuery && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Категории
          </Typography>
          <Box>
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                onClick={() => setSelectedCategory(category)}
                className={classes.categoryChip}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Active Filters */}
      {(selectedCategory || searchQuery) && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Результаты поиска
            {selectedCategory && (
              <Chip
                label={`Категория: ${selectedCategory.name}`}
                onDelete={() => setSelectedCategory(null)}
                className={classes.categoryChip}
                color="primary"
              />
            )}
            {searchQuery && (
              <Chip
                label={`Поиск: "${searchQuery}"`}
                onDelete={() => setSearchQuery('')}
                className={classes.categoryChip}
                color="secondary"
              />
            )}
          </Typography>
        </Box>
      )}

      {/* Products Grid */}
      {loading ? (
        <Typography variant="h6" className={classes.noResults}>
          Загрузка товаров...
        </Typography>
      ) : filteredProducts.length === 0 ? (
        <Typography variant="h6" className={classes.noResults}>
          {searchQuery || selectedCategory 
            ? 'Товары не найдены. Попробуйте изменить параметры поиска.'
            : 'Товары пока не добавлены.'
          }
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.map((product) => (
            <Grid item key={product.id} xs={12} sm={6} md={4} lg={3}>
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
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {product.description}
                    </Typography>
                  )}
                  {product.categoryId && (
                    <Typography variant="caption" color="primary" display="block">
                      {getCategoryName(product.categoryId)}
                    </Typography>
                  )}
                  <Typography className={classes.price}>
                    {product.price} {product.currency || 'USD'}
                  </Typography>
                  {product.inStock ? (
                    <Typography variant="caption" color="textSecondary">
                      В наличии: {product.stockCount || 'Доступно'}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="error">
                      Нет в наличии
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
                    В корзину
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
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
            Корзина
          </Typography>
          <Divider />
          {cart.length === 0 ? (
            <Typography variant="body1" style={{ marginTop: 16 }}>
              Ваша корзина пуста
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
                Итого: {getTotalPrice().toFixed(2)}{' '}
                {cart[0]?.currency || 'USD'}
              </Typography>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleCheckout}
                style={{ marginTop: 16 }}
              >
                Оформить заказ
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </div>
  )
}

export default MerchBrowser
