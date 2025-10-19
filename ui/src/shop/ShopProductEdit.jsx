import React from 'react'
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  BooleanInput,
  ReferenceInput,
  SelectInput,
  required,
  usePermissions,
} from 'react-admin'

const ShopProductEdit = (props) => {
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
    <Edit {...props} title="Edit Product">
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
    </Edit>
  )
}

export default ShopProductEdit
