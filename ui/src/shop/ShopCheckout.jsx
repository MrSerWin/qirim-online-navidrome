import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Box,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { useDataProvider, useNotify, Title } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
    maxWidth: 1200,
    margin: '0 auto',
  },
  card: {
    marginBottom: theme.spacing(3),
  },
  totalPrice: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginTop: theme.spacing(2),
  },
}))

const ShopCheckout = () => {
  const classes = useStyles()
  const dataProvider = useDataProvider()
  const notify = useNotify()

  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const savedCart = localStorage.getItem('shopCart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const order = {
      customerName,
      email,
      phone,
      address,
      city,
      country,
      postalCode,
      items: cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount: getTotalPrice(),
      currency: cart[0]?.currency || 'USD',
      comment,
      status: 'pending',
    }

    try {
      await dataProvider.create('shop/order', { data: order })
      notify('Order placed successfully! We will contact you soon.', {
        type: 'success',
      })
      // Clear cart
      localStorage.removeItem('shopCart')
      // Redirect to shop
      window.location.hash = '#/shop'
    } catch (error) {
      console.error('Error placing order:', error)
      notify('Error placing order. Please try again.', { type: 'warning' })
    } finally {
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className={classes.root}>
        <Title title="Checkout" />
        <Typography variant="h5">Your cart is empty</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => (window.location.hash = '#/shop')}
          style={{ marginTop: 16 }}
        >
          Go to Shop
        </Button>
      </div>
    )
  }

  return (
    <div className={classes.root}>
      <Title title="Checkout" />
      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Full Name"
                      fullWidth
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      type="email"
                      fullWidth
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone"
                      fullWidth
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Address"
                      fullWidth
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="City"
                      fullWidth
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Country"
                      fullWidth
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Postal Code"
                      fullWidth
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Additional Comments"
                      fullWidth
                      multiline
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className={classes.card}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              <List>
                {cart.map((item) => (
                  <ListItem key={item.id}>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.price} ${item.currency || 'USD'} x ${item.quantity} = ${(item.price * item.quantity).toFixed(2)}`}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider />
              <Typography className={classes.totalPrice}>
                Total: {getTotalPrice().toFixed(2)}{' '}
                {cart[0]?.currency || 'USD'}
              </Typography>
              <Box mt={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={submitting || !customerName || !email}
                >
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  )
}

export default ShopCheckout
