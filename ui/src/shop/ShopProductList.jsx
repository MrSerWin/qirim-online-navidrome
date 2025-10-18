import React from 'react'
import {
  List,
  Datagrid,
  TextField,
  NumberField,
  BooleanField,
  ReferenceField,
  EditButton,
  DeleteButton,
  CreateButton,
  usePermissions,
} from 'react-admin'

const ShopProductList = (props) => {
  const { permissions } = usePermissions()
  const isAdmin = permissions === 'admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Access Denied</h2>
        <p>Only administrators can manage shop products.</p>
      </div>
    )
  }

  return (
    <List
      {...props}
      title="Shop Products"
      perPage={25}
      sort={{ field: 'sortOrder', order: 'ASC' }}
      actions={
        <CreateButton basePath="/shop-product">Create Product</CreateButton>
      }
    >
      <Datagrid>
        <TextField source="name" label="Name" />
        <ReferenceField
          source="categoryId"
          reference="shop-category"
          label="Category"
        >
          <TextField source="name" />
        </ReferenceField>
        <NumberField source="price" label="Price" />
        <TextField source="currency" label="Currency" />
        <BooleanField source="inStock" label="In Stock" />
        <NumberField source="stockCount" label="Stock" />
        <EditButton />
        <DeleteButton />
      </Datagrid>
    </List>
  )
}

export default ShopProductList
