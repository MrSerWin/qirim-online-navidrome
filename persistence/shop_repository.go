package persistence

import (
	"context"
	"encoding/json"

	"github.com/deluan/rest"
	"github.com/google/uuid"
	"github.com/navidrome/navidrome/model"
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
	sel := r.newSelect().Columns("*").Where(dbx.HashExp{"id": id})
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
	if category.ID == "" {
		category.ID = uuid.NewString()
	}

	cols := map[string]interface{}{
		"id":          category.ID,
		"name":        category.Name,
		"description": category.Description,
		"image_url":   category.ImageUrl,
		"sort_order":  category.SortOrder,
		"updated_at":  dbx.NewExp("datetime('now')"),
	}

	// Try insert first
	cols["created_at"] = dbx.NewExp("datetime('now')")
	_, err := r.db.Insert(r.tableName, cols).Execute()
	if err != nil {
		// If insert fails, try update
		delete(cols, "created_at")
		_, err = r.db.Update(r.tableName, cols, dbx.HashExp{"id": category.ID}).Execute()
	}

	return category.ID, err
}

func (r *shopCategoryRepository) Delete(id string) error {
	_, err := r.db.Delete(r.tableName, dbx.HashExp{"id": id}).Execute()
	return err
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
	sel := r.newSelect().Columns("*").Where(dbx.HashExp{"id": id})
	var product model.ShopProduct
	err := r.queryOne(sel, &product)
	if err != nil {
		return nil, err
	}

	// Deserialize images JSON if present
	if product.ImageUrl != "" {
		var images []string
		if err := json.Unmarshal([]byte(product.ImageUrl), &images); err == nil {
			product.Images = images
		}
	}

	return &product, nil
}

// Override Read for ShopOrder to deserialize items JSON
func (r *shopOrderRepository) Read(id string) (interface{}, error) {
	sel := r.newSelect().Columns("*").Where(dbx.HashExp{"id": id})
	var order model.ShopOrder
	err := r.queryOne(sel, &order)
	if err != nil {
		return nil, err
	}

	// Deserialize items JSON
	var items []model.ShopOrderItem
	if err := json.Unmarshal([]byte(order.Comment), &items); err == nil {
		order.Items = items
	}

	return &order, nil
}

// Override ReadAll for ShopProduct to handle JSON deserialization
func (r *shopProductRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	var products model.ShopProducts
	sq := r.newSelect(r.parseRestOptions(r.ctx, options...)).Columns("*")
	err := r.queryAll(sq, &products)
	if err != nil {
		return nil, err
	}
	return products, nil
}

// Override ReadAll for ShopOrder
func (r *shopOrderRepository) ReadAll(options ...rest.QueryOptions) (interface{}, error) {
	var orders model.ShopOrders
	sq := r.newSelect(r.parseRestOptions(r.ctx, options...)).Columns("*")
	err := r.queryAll(sq, &orders)
	if err != nil {
		return nil, err
	}
	return orders, nil
}

// Override Put for ShopProduct to serialize images
func (r *shopProductRepository) Put(entity interface{}) (string, error) {
	product := entity.(*model.ShopProduct)
	if product.ID == "" {
		product.ID = uuid.NewString()
	}

	// Serialize images to JSON
	imagesJSON, _ := json.Marshal(product.Images)

	cols := map[string]interface{}{
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
		"updated_at":  dbx.NewExp("datetime('now')"),
	}

	// Try insert first
	cols["created_at"] = dbx.NewExp("datetime('now')")
	_, err := r.db.Insert(r.tableName, cols).Execute()
	if err != nil {
		// If insert fails, try update
		delete(cols, "created_at")
		_, err = r.db.Update(r.tableName, cols, dbx.HashExp{"id": product.ID}).Execute()
	}

	return product.ID, err
}

func (r *shopProductRepository) Delete(id string) error {
	_, err := r.db.Delete(r.tableName, dbx.HashExp{"id": id}).Execute()
	return err
}

// Override Put for ShopOrder to serialize items
func (r *shopOrderRepository) Put(entity interface{}) (string, error) {
	order := entity.(*model.ShopOrder)
	if order.ID == "" {
		order.ID = uuid.NewString()
		order.Status = "pending"
	}

	// Serialize items to JSON
	itemsJSON, _ := json.Marshal(order.Items)

	cols := map[string]interface{}{
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
		"updated_at":    dbx.NewExp("datetime('now')"),
	}

	// Try insert first
	cols["created_at"] = dbx.NewExp("datetime('now')")
	_, err := r.db.Insert(r.tableName, cols).Execute()
	if err != nil {
		// If insert fails, try update
		delete(cols, "created_at")
		_, err = r.db.Update(r.tableName, cols, dbx.HashExp{"id": order.ID}).Execute()
	}

	return order.ID, err
}

func (r *shopOrderRepository) Delete(id string) error {
	_, err := r.db.Delete(r.tableName, dbx.HashExp{"id": id}).Execute()
	return err
}
