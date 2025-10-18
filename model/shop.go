package model

import "time"

type ShopCategory struct {
	ID          string    `json:"id" orm:"pk;column(id)"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ImageUrl    string    `json:"imageUrl" orm:"column(image_url)"`
	SortOrder   int       `json:"sortOrder" orm:"column(sort_order)"`
	CreatedAt   time.Time `json:"createdAt" orm:"column(created_at)"`
	UpdatedAt   time.Time `json:"updatedAt" orm:"column(updated_at)"`
}

type ShopProduct struct {
	ID          string    `json:"id" orm:"pk;column(id)"`
	CategoryID  string    `json:"categoryId" orm:"column(category_id)"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	Currency    string    `json:"currency"` // USD, EUR, TRY, etc.
	ImageUrl    string    `json:"imageUrl" orm:"column(image_url)"`
	Images      []string  `json:"images"` // Additional images (JSON array)
	InStock     bool      `json:"inStock" orm:"column(in_stock)"`
	StockCount  int       `json:"stockCount" orm:"column(stock_count)"`
	SortOrder   int       `json:"sortOrder" orm:"column(sort_order)"`
	CreatedAt   time.Time `json:"createdAt" orm:"column(created_at)"`
	UpdatedAt   time.Time `json:"updatedAt" orm:"column(updated_at)"`
}

type ShopOrderItem struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	Price       float64 `json:"price"`
	Quantity    int     `json:"quantity"`
}

type ShopOrder struct {
	ID           string          `json:"id" orm:"pk;column(id)"`
	CustomerName string          `json:"customerName" orm:"column(customer_name)"`
	Email        string          `json:"email"`
	Phone        string          `json:"phone"`
	Address      string          `json:"address"`
	City         string          `json:"city"`
	Country      string          `json:"country"`
	PostalCode   string          `json:"postalCode" orm:"column(postal_code)"`
	Items        []ShopOrderItem `json:"items"` // JSON array of items
	TotalAmount  float64         `json:"totalAmount" orm:"column(total_amount)"`
	Currency     string          `json:"currency"`
	Comment      string          `json:"comment"`
	Status       string          `json:"status"` // pending, confirmed, shipped, delivered, cancelled
	CreatedAt    time.Time       `json:"createdAt" orm:"column(created_at)"`
	UpdatedAt    time.Time       `json:"updatedAt" orm:"column(updated_at)"`
}

type ShopCategories []ShopCategory
type ShopProducts []ShopProduct
type ShopOrders []ShopOrder

func (ShopCategory) TableName() string {
	return "shop_category"
}

func (ShopProduct) TableName() string {
	return "shop_product"
}

func (ShopOrder) TableName() string {
	return "shop_order"
}
