import React from 'react'
import {
  List,
  Datagrid,
  TextField,
  EditButton,
  DeleteButton,
  CreateButton,
  usePermissions,
} from 'react-admin'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles({
  headerCell: {
    fontWeight: 'bold',
  },
})

const ShopCategoryList = (props) => {
  const classes = useStyles()
  const { permissions } = usePermissions()
  const isAdmin = permissions === 'admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Access Denied</h2>
        <p>Only administrators can manage shop categories.</p>
      </div>
    )
  }

  return (
    <List
      {...props}
      title="Shop Categories"
      perPage={25}
      sort={{ field: 'sortOrder', order: 'ASC' }}
      actions={
        <CreateButton basePath="/shop-category">Create Category</CreateButton>
      }
    >
      <Datagrid>
        <TextField source="name" label="Name" className={classes.headerCell} />
        <TextField source="description" label="Description" />
        <TextField source="sortOrder" label="Sort Order" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  )
}

export default ShopCategoryList
