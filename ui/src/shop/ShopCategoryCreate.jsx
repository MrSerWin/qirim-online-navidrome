import React from 'react'
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  required,
  usePermissions,
} from 'react-admin'

const ShopCategoryCreate = (props) => {
  const { permissions } = usePermissions()
  const isAdmin = permissions === 'admin'

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Access Denied</h2>
      </div>
    )
  }

  return (
    <Create {...props} title="Create Category">
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <TextInput source="description" multiline fullWidth />
        <TextInput source="imageUrl" label="Image URL" fullWidth />
        <NumberInput source="sortOrder" label="Sort Order" defaultValue={0} />
      </SimpleForm>
    </Create>
  )
}

export default ShopCategoryCreate
