import React from 'react'
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  usePermissions,
  FunctionField,
  EditButton,
} from 'react-admin'
import { Chip } from '@material-ui/core'

const StatusField = ({ record }) => {
  const getColor = (status) => {
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

  return <Chip label={getStatusText(record.status)} color={getColor(record.status)} />
}

const ShopOrderList = (props) => {
  const { permissions } = usePermissions()
  const isAdmin = permissions === 'admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Access Denied</h2>
        <p>Only administrators can view orders.</p>
      </div>
    )
  }

  return (
    <List
      {...props}
      title="Заказы магазина"
      perPage={25}
      sort={{ field: 'createdAt', order: 'DESC' }}
    >
      <Datagrid>
        <TextField source="id" label="ID заказа" />
        <TextField source="customerName" label="Клиент" />
        <TextField source="email" label="Email" />
        <TextField source="phone" label="Телефон" />
        <FunctionField
          label="Товары"
          render={(record) =>
            record.items ? `${record.items.length} товаров` : '-'
          }
        />
        <NumberField source="totalAmount" label="Сумма" />
        <TextField source="currency" label="Валюта" />
        <FunctionField
          label="Статус"
          render={(record) => <StatusField record={record} />}
        />
        <DateField source="createdAt" label="Создан" showTime />
        <EditButton label="Редактировать" />
      </Datagrid>
    </List>
  )
}

export default ShopOrderList
