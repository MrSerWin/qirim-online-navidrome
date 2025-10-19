import React, { useState, useEffect } from 'react'
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import VisibilityIcon from '@material-ui/icons/Visibility'
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart'
import { useDataProvider, useNotify, usePermissions } from 'react-admin'

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  header: {
    marginBottom: theme.spacing(3),
  },
  orderCard: {
    marginBottom: theme.spacing(2),
  },
  statusChip: {
    marginLeft: theme.spacing(1),
  },
  orderDetails: {
    marginTop: theme.spacing(2),
  },
  itemsTable: {
    marginTop: theme.spacing(2),
  },
  totalAmount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: theme.palette.primary.main,
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
  loadingState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
}))

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'default'
    case 'confirmed':
      return 'primary'
    case 'processing':
      return 'secondary'
    case 'shipped':
      return 'primary'
    case 'delivered':
      return 'primary'
    case 'cancelled':
      return 'secondary'
    default:
      return 'default'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'pending':
      return 'Ожидает подтверждения'
    case 'confirmed':
      return 'Подтвержден'
    case 'processing':
      return 'В обработке'
    case 'shipped':
      return 'Отправлен'
    case 'delivered':
      return 'Доставлен'
    case 'cancelled':
      return 'Отменен'
    default:
      return status
  }
}

const UserOrders = () => {
  const classes = useStyles()
  const dataProvider = useDataProvider()
  const notify = useNotify()
  const { permissions } = usePermissions()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Load user orders
  useEffect(() => {
    if (permissions === 'guest') {
      setLoading(false)
      return
    }

    dataProvider
      .getList('shop/order', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'createdAt', order: 'DESC' },
      })
      .then(({ data }) => {
        setOrders(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error loading orders:', error)
        notify('Ошибка загрузки заказов', { type: 'warning' })
        setLoading(false)
      })
  }, [dataProvider, notify, permissions])

  const handleViewDetails = (order) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setDetailsOpen(false)
    setSelectedOrder(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (permissions === 'guest') {
    return (
      <div className={classes.root}>
        <div className={classes.emptyState}>
          <ShoppingCartIcon style={{ fontSize: 64, marginBottom: 16 }} />
          <Typography variant="h6" gutterBottom>
            Войдите в систему для просмотра заказов
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Для просмотра ваших заказов необходимо войти в систему
          </Typography>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.loadingState}>
          <CircularProgress />
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className={classes.root}>
        <div className={classes.header}>
          <Typography variant="h4" gutterBottom>
            Мои заказы
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Здесь будут отображаться ваши заказы
          </Typography>
        </div>
        <div className={classes.emptyState}>
          <ShoppingCartIcon style={{ fontSize: 64, marginBottom: 16 }} />
          <Typography variant="h6" gutterBottom>
            У вас пока нет заказов
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Перейдите в раздел "Наш Мерч" чтобы сделать первый заказ
          </Typography>
        </div>
      </div>
    )
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h4" gutterBottom>
          Мои заказы
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Всего заказов: {orders.length}
        </Typography>
      </div>

      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid item key={order.id} xs={12}>
            <Card className={classes.orderCard}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Заказ #{order.id.slice(-8).toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Дата: {formatDate(order.createdAt)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Сумма: {order.totalAmount} {order.currency || 'USD'}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Chip
                      label={getStatusText(order.status)}
                      color={getStatusColor(order.status)}
                      className={classes.statusChip}
                    />
                    <IconButton
                      onClick={() => handleViewDetails(order)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Box>
                </Box>

                <Divider className={classes.orderDetails} />

                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Контактная информация:
                  </Typography>
                  <Typography variant="body2">
                    {order.customerName} • {order.email} • {order.phone}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {order.address}, {order.city}, {order.country} {order.postalCode}
                  </Typography>
                </Box>

                {order.comment && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Комментарий:
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {order.comment}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Order Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Детали заказа #{selectedOrder?.id.slice(-8).toUpperCase()}
        </DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Информация о заказе
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Статус"
                        secondary={
                          <Chip
                            label={getStatusText(selectedOrder.status)}
                            color={getStatusColor(selectedOrder.status)}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Дата создания"
                        secondary={formatDate(selectedOrder.createdAt)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Последнее обновление"
                        secondary={formatDate(selectedOrder.updatedAt)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Общая сумма"
                        secondary={
                          <Typography className={classes.totalAmount}>
                            {selectedOrder.totalAmount} {selectedOrder.currency || 'USD'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Контактная информация
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Имя"
                        secondary={selectedOrder.customerName}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Email"
                        secondary={selectedOrder.email}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Телефон"
                        secondary={selectedOrder.phone}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Адрес"
                        secondary={`${selectedOrder.address}, ${selectedOrder.city}, ${selectedOrder.country} ${selectedOrder.postalCode}`}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>

              {selectedOrder.comment && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Комментарий
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedOrder.comment}
                  </Typography>
                </Box>
              )}

              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Товары в заказе
                </Typography>
                <TableContainer component={Paper} className={classes.itemsTable}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Товар</TableCell>
                        <TableCell align="right">Цена</TableCell>
                        <TableCell align="right">Количество</TableCell>
                        <TableCell align="right">Сумма</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedOrder.items?.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {item.productName || `Товар ${item.productId.slice(-8)}`}
                          </TableCell>
                          <TableCell align="right">
                            {item.price} {selectedOrder.currency || 'USD'}
                          </TableCell>
                          <TableCell align="right">
                            {item.quantity}
                          </TableCell>
                          <TableCell align="right">
                            {(item.price * item.quantity).toFixed(2)} {selectedOrder.currency || 'USD'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default UserOrders
