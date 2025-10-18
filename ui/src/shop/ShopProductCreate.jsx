import React from 'react'
import {
  Create,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
  required,
  usePermissions,
} from 'react-admin'

const ShopProductCreate = (props) => {
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
    <Create {...props} title="Create Product">
      <SimpleForm>
        <TextInput source="name" validate={required()} fullWidth />
        <ReferenceInput source="categoryId" reference="shop-category">
          <SelectInput optionText="name" />
        </ReferenceInput>
        <TextInput source="description" multiline rows={4} fullWidth />
        <NumberInput
          source="price"
          validate={required()}
          step={0.01}
          min={0}
        />
        <TextInput source="currency" defaultValue="USD" />
        <TextInput source="imageUrl" label="Image URL" fullWidth />
        <BooleanInput source="inStock" label="In Stock" defaultValue={true} />
        <NumberInput source="stockCount" label="Stock Count" defaultValue={0} />
        <NumberInput source="sortOrder" label="Sort Order" defaultValue={0} />
      </SimpleForm>
    </Create>
  )
}

export default ShopProductCreate
