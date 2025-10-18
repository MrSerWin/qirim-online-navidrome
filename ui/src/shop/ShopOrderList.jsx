import React from 'react'
import {
  List,
  Datagrid,
  TextField,
  DateField,
  NumberField,
  usePermissions,
  FunctionField,
} from 'react-admin'
import { Chip } from '@material-ui/core'

const StatusField = ({ record }) => {
  const getColor = (status) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'confirmed':
        return 'primary'
      case 'shipped':
        return 'secondary'
      case 'delivered':
        return 'primary'
      case 'cancelled':
        return 'default'
      default:
        return 'default'
    }
  }

  return <Chip label={record.status} color={getColor(record.status)} />
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
      title="Shop Orders"
      perPage={25}
      sort={{ field: 'createdAt', order: 'DESC' }}
    >
      <Datagrid>
        <TextField source="id" label="Order ID" />
        <TextField source="customerName" label="Customer" />
        <TextField source="email" label="Email" />
        <TextField source="phone" label="Phone" />
        <FunctionField
          label="Items"
          render={(record) =>
            record.items ? `${record.items.length} items` : '-'
          }
        />
        <NumberField source="totalAmount" label="Total" />
        <TextField source="currency" label="Currency" />
        <FunctionField
          label="Status"
          render={(record) => <StatusField record={record} />}
        />
        <DateField source="createdAt" label="Created" showTime />
      </Datagrid>
    </List>
  )
}

export default ShopOrderList
