import React from 'react'
import {
  Edit,
  SimpleForm,
  TextInput,
  NumberInput,
  SelectInput,
  ArrayInput,
  SimpleFormIterator,
  required,
  useNotify,
  useRedirect,
} from 'react-admin'

const OrderStatusChoices = [
  { id: 'pending', name: 'Ожидает подтверждения' },
  { id: 'confirmed', name: 'Подтвержден' },
  { id: 'processing', name: 'В обработке' },
  { id: 'shipped', name: 'Отправлен' },
  { id: 'delivered', name: 'Доставлен' },
  { id: 'cancelled', name: 'Отменен' },
]

const CurrencyChoices = [
  { id: 'USD', name: 'USD' },
  { id: 'EUR', name: 'EUR' },
  { id: 'RUB', name: 'RUB' },
  { id: 'UAH', name: 'UAH' },
]

const ShopOrderEdit = (props) => {
  const notify = useNotify()
  const redirect = useRedirect()

  const transform = (data) => {
    // Ensure items is an array
    if (!Array.isArray(data.items)) {
      data.items = []
    }
    return data
  }

  const onSuccess = () => {
    notify('Заказ успешно обновлен')
    redirect('/shop-order')
  }

  return (
    <Edit
      {...props}
      transform={transform}
      onSuccess={onSuccess}
      title="Редактирование заказа"
    >
      <SimpleForm>
        <TextInput
          source="id"
          label="ID заказа"
          disabled
          fullWidth
        />
        
        <TextInput
          source="customerName"
          label="Имя клиента"
          validate={required()}
          fullWidth
        />
        
        <TextInput
          source="email"
          label="Email"
          type="email"
          fullWidth
        />
        
        <TextInput
          source="phone"
          label="Телефон"
          fullWidth
        />
        
        <TextInput
          source="address"
          label="Адрес"
          multiline
          rows={2}
          fullWidth
        />
        
        <TextInput
          source="city"
          label="Город"
          fullWidth
        />
        
        <TextInput
          source="country"
          label="Страна"
          fullWidth
        />
        
        <TextInput
          source="postalCode"
          label="Почтовый индекс"
          fullWidth
        />
        
        <ArrayInput
          source="items"
          label="Товары в заказе"
        >
          <SimpleFormIterator>
            <TextInput
              source="productId"
              label="ID товара"
              fullWidth
            />
            <TextInput
              source="productName"
              label="Название товара"
              fullWidth
            />
            <NumberInput
              source="price"
              label="Цена"
              min={0}
              step={0.01}
            />
            <NumberInput
              source="quantity"
              label="Количество"
              min={1}
            />
          </SimpleFormIterator>
        </ArrayInput>
        
        <NumberInput
          source="totalAmount"
          label="Общая сумма"
          min={0}
          step={0.01}
          validate={required()}
        />
        
        <SelectInput
          source="currency"
          label="Валюта"
          choices={CurrencyChoices}
          defaultValue="USD"
        />
        
        <TextInput
          source="comment"
          label="Комментарий"
          multiline
          rows={3}
          fullWidth
        />
        
        <SelectInput
          source="status"
          label="Статус заказа"
          choices={OrderStatusChoices}
          validate={required()}
        />
      </SimpleForm>
    </Edit>
  )
}

export default ShopOrderEdit
