package persistence

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	. "github.com/Masterminds/squirrel"
	"github.com/deluan/rest"
	"github.com/navidrome/navidrome/model"
	"github.com/navidrome/navidrome/model/id"
	"github.com/pocketbase/dbx"
)

type shopCategoryRepository struct {
	sqlRepository
}

func NewShopCategoryRepository(ctx context.Context, db dbx.Builder) model.ResourceRepository {
	r := &shopCategoryRepository{}
	r.ctx = ctx
	r.db = db
	r.tableName = "shop_category"
	r.registerModel(model.ShopCategory{}, nil)
	return r
}

func (r *shopCategoryRepository) EntityName() string {
	return "shop_category"
}

func (r *shopCategoryRepository) NewInstance() interface{} {
	return &model.ShopCategory{}
}

func (r *shopCategoryRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.count(r.newSelect(), r.parseRestOptions(r.ctx, options...))
}

func (r *shopCategoryRepository) Read(id string) (interface{}, error) {
	sel := r.newSelect().Columns("*").Where(Eq{"id": id})
	var category model.ShopCategory
	err := r.queryOne(sel, &category)
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *shopCategoryRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	var categories model.ShopCategories
	sq := r.newSelect(r.parseRestOptions(r.ctx, options...)).Columns("*")
	err := r.queryAll(sq, &categories)
	if err != nil {
		return nil, err
	}
	return categories, nil
}

func (r *shopCategoryRepository) Put(entity interface{}) (string, error) {
	category := entity.(*model.ShopCategory)
	
	// Create a map with the correct column names
	values := map[string]interface{}{
		"id":          category.ID,
		"name":        category.Name,
		"description": category.Description,
		"image_url":   category.ImageUrl,
		"sort_order":  category.SortOrder,
		"updated_at":  time.Now(),
	}
	
	// If it has an ID, try to update first
	if category.ID != "" {
		updateValues := map[string]interface{}{}
		for k, v := range values {
			updateValues[k] = v
		}
		
		update := Update(r.tableName).Where(Eq{"id": category.ID}).SetMap(updateValues)
		count, err := r.executeSQL(update)
		if err != nil {
			return "", err
		}
		if count > 0 {
			return category.ID, nil
		}
	}
	
	// If it doesn't have an ID OR the ID was not found, insert it
	if category.ID == "" {
		category.ID = id.NewRandom()
		values["id"] = category.ID
	}
	values["created_at"] = time.Now()
	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return category.ID, err
}

func (r *shopCategoryRepository) Delete(id string) error {
	return r.delete(Eq{"id": id})
}

type shopProductRepository struct {
	sqlRepository
}

func NewShopProductRepository(ctx context.Context, db dbx.Builder) model.ResourceRepository {
	r := &shopProductRepository{}
	r.ctx = ctx
	r.db = db
	r.tableName = "shop_product"
	r.registerModel(model.ShopProduct{}, nil)
	return r
}

func (r *shopProductRepository) EntityName() string {
	return "shop_product"
}

func (r *shopProductRepository) NewInstance() interface{} {
	return &model.ShopProduct{}
}

func (r *shopProductRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.count(r.newSelect(), r.parseRestOptions(r.ctx, options...))
}

type shopOrderRepository struct {
	sqlRepository
}

func NewShopOrderRepository(ctx context.Context, db dbx.Builder) model.ResourceRepository {
	r := &shopOrderRepository{}
	r.ctx = ctx
	r.db = db
	r.tableName = "shop_order"
	r.registerModel(model.ShopOrder{}, nil)
	return r
}

func (r *shopOrderRepository) EntityName() string {
	return "shop_order"
}

func (r *shopOrderRepository) NewInstance() interface{} {
	return &model.ShopOrder{}
}

func (r *shopOrderRepository) Count(options ...rest.QueryOptions) (int64, error) {
	return r.count(r.newSelect(), r.parseRestOptions(r.ctx, options...))
}

// Override Read for ShopProduct to deserialize images JSON
func (r *shopProductRepository) Read(id string) (interface{}, error) {
	sel := r.newSelect().Columns("*").Where(Eq{"id": id})
	
	// Create a temporary struct to hold the raw data
	type shopProductRaw struct {
		model.ShopProduct
		ImagesJSON string `db:"images"`
	}
	
	var rawProduct shopProductRaw
	err := r.queryOne(sel, &rawProduct)
	if err != nil {
		return nil, err
	}

	// Deserialize images JSON if present
	if rawProduct.ImagesJSON != "" {
		var images []string
		if err := json.Unmarshal([]byte(rawProduct.ImagesJSON), &images); err == nil {
			rawProduct.Images = images
		}
	}

	return &rawProduct.ShopProduct, nil
}

// Override Read for ShopOrder to deserialize items JSON
func (r *shopOrderRepository) Read(id string) (interface{}, error) {
	sel := r.newSelect().Columns("*").Where(Eq{"id": id})
	
	// Create a temporary struct to hold the raw data
	type shopOrderRaw struct {
		ID           string  `db:"id"`
		CustomerName string  `db:"customer_name"`
		Email        string  `db:"email"`
		Phone        string  `db:"phone"`
		Address      string  `db:"address"`
		City         string  `db:"city"`
		Country      string  `db:"country"`
		PostalCode   string  `db:"postal_code"`
		Items        string  `db:"items"` // JSON string
		TotalAmount  float64 `db:"total_amount"`
		Currency     string  `db:"currency"`
		Comment      string  `db:"comment"`
		Status       string  `db:"status"`
		CreatedAt    time.Time `db:"created_at"`
		UpdatedAt    time.Time `db:"updated_at"`
	}
	
	var rawOrder shopOrderRaw
	err := r.queryOne(sel, &rawOrder)
	if err != nil {
		return nil, err
	}
	
	// Convert to final order with deserialized items
	order := model.ShopOrder{
		ID:           rawOrder.ID,
		CustomerName: rawOrder.CustomerName,
		Email:        rawOrder.Email,
		Phone:        rawOrder.Phone,
		Address:      rawOrder.Address,
		City:         rawOrder.City,
		Country:      rawOrder.Country,
		PostalCode:   rawOrder.PostalCode,
		TotalAmount:  rawOrder.TotalAmount,
		Currency:     rawOrder.Currency,
		Comment:      rawOrder.Comment,
		Status:       rawOrder.Status,
		CreatedAt:    rawOrder.CreatedAt,
		UpdatedAt:    rawOrder.UpdatedAt,
	}
	
	// Deserialize items JSON if present
	if rawOrder.Items != "" {
		var items []model.ShopOrderItem
		if err := json.Unmarshal([]byte(rawOrder.Items), &items); err == nil {
			order.Items = items
		}
	}
	
	return &order, nil
}

// Override ReadAll for ShopProduct to handle JSON deserialization
func (r *shopProductRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	sq := r.newSelect(r.parseRestOptions(r.ctx, options...)).Columns("*")
	
	// Create a temporary struct to hold the raw data
	type shopProductRaw struct {
		ID          string         `db:"id"`
		CategoryID  sql.NullString `db:"category_id"`
		Name        string         `db:"name"`
		Description string         `db:"description"`
		Price       float64        `db:"price"`
		Currency    string         `db:"currency"`
		ImageUrl    string         `db:"image_url"`
		Images      string         `db:"images"` // JSON string
		InStock     bool           `db:"in_stock"`
		StockCount  int            `db:"stock_count"`
		SortOrder   int            `db:"sort_order"`
		CreatedAt   time.Time      `db:"created_at"`
		UpdatedAt   time.Time      `db:"updated_at"`
	}
	
	var rawProducts []shopProductRaw
	err := r.queryAll(sq, &rawProducts)
	if err != nil {
		return nil, err
	}
	
	// Convert to final products with deserialized images
	var products model.ShopProducts
	for _, rawProduct := range rawProducts {
		product := model.ShopProduct{
			ID:          rawProduct.ID,
			Name:        rawProduct.Name,
			Description: rawProduct.Description,
			Price:       rawProduct.Price,
			Currency:    rawProduct.Currency,
			ImageUrl:    rawProduct.ImageUrl,
			InStock:     rawProduct.InStock,
			StockCount:  rawProduct.StockCount,
			SortOrder:   rawProduct.SortOrder,
			CreatedAt:   rawProduct.CreatedAt,
			UpdatedAt:   rawProduct.UpdatedAt,
		}
		
		// Handle NULL category_id
		if rawProduct.CategoryID.Valid {
			product.CategoryID = rawProduct.CategoryID.String
		}
		
		// Deserialize images JSON if present
		if rawProduct.Images != "" {
			var images []string
			if err := json.Unmarshal([]byte(rawProduct.Images), &images); err == nil {
				product.Images = images
			}
		}
		
		products = append(products, product)
	}
	
	return products, nil
}

// Override ReadAll for ShopOrder
func (r *shopOrderRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	sq := r.newSelect(r.parseRestOptions(r.ctx, options...)).Columns("*")
	
	// Create a temporary struct to hold the raw data
	type shopOrderRaw struct {
		ID           string  `db:"id"`
		CustomerName string  `db:"customer_name"`
		Email        string  `db:"email"`
		Phone        string  `db:"phone"`
		Address      string  `db:"address"`
		City         string  `db:"city"`
		Country      string  `db:"country"`
		PostalCode   string  `db:"postal_code"`
		Items        string  `db:"items"` // JSON string
		TotalAmount  float64 `db:"total_amount"`
		Currency     string  `db:"currency"`
		Comment      string  `db:"comment"`
		Status       string  `db:"status"`
		CreatedAt    time.Time `db:"created_at"`
		UpdatedAt    time.Time `db:"updated_at"`
	}
	
	var rawOrders []shopOrderRaw
	err := r.queryAll(sq, &rawOrders)
	if err != nil {
		return nil, err
	}
	
	// Convert to final orders with deserialized items
	var orders model.ShopOrders
	for _, rawOrder := range rawOrders {
		order := model.ShopOrder{
			ID:           rawOrder.ID,
			CustomerName: rawOrder.CustomerName,
			Email:        rawOrder.Email,
			Phone:        rawOrder.Phone,
			Address:      rawOrder.Address,
			City:         rawOrder.City,
			Country:      rawOrder.Country,
			PostalCode:   rawOrder.PostalCode,
			TotalAmount:  rawOrder.TotalAmount,
			Currency:     rawOrder.Currency,
			Comment:      rawOrder.Comment,
			Status:       rawOrder.Status,
			CreatedAt:    rawOrder.CreatedAt,
			UpdatedAt:    rawOrder.UpdatedAt,
		}
		
		// Deserialize items JSON if present
		if rawOrder.Items != "" {
			var items []model.ShopOrderItem
			if err := json.Unmarshal([]byte(rawOrder.Items), &items); err == nil {
				order.Items = items
			}
		}
		
		orders = append(orders, order)
	}
	
	return orders, nil
}

// Override Put for ShopProduct to serialize images
func (r *shopProductRepository) Put(entity interface{}) (string, error) {
	product := entity.(*model.ShopProduct)
	
	// Serialize images to JSON
	imagesJSON, _ := json.Marshal(product.Images)
	
	// Create a map with the correct column names
	values := map[string]interface{}{
		"id":          product.ID,
		"category_id": product.CategoryID,
		"name":        product.Name,
		"description": product.Description,
		"price":       product.Price,
		"currency":    product.Currency,
		"image_url":   product.ImageUrl,
		"images":      string(imagesJSON),
		"in_stock":    product.InStock,
		"stock_count": product.StockCount,
		"sort_order":  product.SortOrder,
		"updated_at":  time.Now(),
	}
	
	// If it has an ID, try to update first
	if product.ID != "" {
		updateValues := map[string]interface{}{}
		for k, v := range values {
			updateValues[k] = v
		}
		
		update := Update(r.tableName).Where(Eq{"id": product.ID}).SetMap(updateValues)
		count, err := r.executeSQL(update)
		if err != nil {
			return "", err
		}
		if count > 0 {
			return product.ID, nil
		}
	}
	
	// If it doesn't have an ID OR the ID was not found, insert it
	if product.ID == "" {
		product.ID = id.NewRandom()
		values["id"] = product.ID
	}
	values["created_at"] = time.Now()
	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return product.ID, err
}

func (r *shopProductRepository) Delete(id string) error {
	return r.delete(Eq{"id": id})
}

// Override Put for ShopOrder to serialize items
func (r *shopOrderRepository) Put(entity interface{}) (string, error) {
	order := entity.(*model.ShopOrder)
	
	// Serialize items to JSON
	itemsJSON, _ := json.Marshal(order.Items)
	
	// Create a map with the correct column names
	values := map[string]interface{}{
		"id":            order.ID,
		"customer_name": order.CustomerName,
		"email":         order.Email,
		"phone":         order.Phone,
		"address":       order.Address,
		"city":          order.City,
		"country":       order.Country,
		"postal_code":   order.PostalCode,
		"items":         string(itemsJSON),
		"total_amount":  order.TotalAmount,
		"currency":      order.Currency,
		"comment":       order.Comment,
		"status":        order.Status,
		"updated_at":    time.Now(),
	}
	
	// If it has an ID, try to update first
	if order.ID != "" {
		updateValues := map[string]interface{}{}
		for k, v := range values {
			updateValues[k] = v
		}
		
		update := Update(r.tableName).Where(Eq{"id": order.ID}).SetMap(updateValues)
		count, err := r.executeSQL(update)
		if err != nil {
			return "", err
		}
		if count > 0 {
			return order.ID, nil
		}
	}
	
	// If it doesn't have an ID OR the ID was not found, insert it
	if order.ID == "" {
		order.ID = id.NewRandom()
		values["id"] = order.ID
	}
	values["created_at"] = time.Now()
	insert := Insert(r.tableName).SetMap(values)
	_, err := r.executeSQL(insert)
	return order.ID, err
}

func (r *shopOrderRepository) Delete(id string) error {
	return r.delete(Eq{"id": id})
}

// Save method for ShopCategory
func (r *shopCategoryRepository) Save(entity interface{}) (string, error) {
	category := entity.(*model.ShopCategory)
	return r.Put(category)
}

// Save method for ShopProduct
func (r *shopProductRepository) Save(entity interface{}) (string, error) {
	product := entity.(*model.ShopProduct)
	return r.Put(product)
}

// Save method for ShopOrder
func (r *shopOrderRepository) Save(entity interface{}) (string, error) {
	order := entity.(*model.ShopOrder)
	return r.Put(order)
}

// Update method for ShopCategory
func (r *shopCategoryRepository) Update(id string, entity interface{}, cols ...string) error {
	category := entity.(*model.ShopCategory)
	category.ID = id
	_, err := r.Put(category)
	return err
}

// Update method for ShopProduct
func (r *shopProductRepository) Update(id string, entity interface{}, cols ...string) error {
	product := entity.(*model.ShopProduct)
	product.ID = id
	_, err := r.Put(product)
	return err
}

// Update method for ShopOrder
func (r *shopOrderRepository) Update(id string, entity interface{}, cols ...string) error {
	order := entity.(*model.ShopOrder)
	order.ID = id
	_, err := r.Put(order)
	return err
}

// Interface compliance checks
var _ rest.Repository = (*shopCategoryRepository)(nil)
var _ rest.Persistable = (*shopCategoryRepository)(nil)
var _ rest.Repository = (*shopProductRepository)(nil)
var _ rest.Persistable = (*shopProductRepository)(nil)
var _ rest.Repository = (*shopOrderRepository)(nil)
var _ rest.Persistable = (*shopOrderRepository)(nil)
