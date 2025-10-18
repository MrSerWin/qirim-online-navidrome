-- +goose Up
-- Create shop_category table
CREATE TABLE IF NOT EXISTS shop_category (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS shop_category_sort_order ON shop_category(sort_order);

-- Create shop_product table
CREATE TABLE IF NOT EXISTS shop_product (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    category_id VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    image_url VARCHAR(500),
    images TEXT, -- JSON array
    in_stock BOOLEAN DEFAULT 1,
    stock_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (category_id) REFERENCES shop_category(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS shop_product_category_id ON shop_product(category_id);
CREATE INDEX IF NOT EXISTS shop_product_sort_order ON shop_product(sort_order);
CREATE INDEX IF NOT EXISTS shop_product_in_stock ON shop_product(in_stock);

-- Create shop_order table
CREATE TABLE IF NOT EXISTS shop_order (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    address TEXT,
    city VARCHAR(255),
    country VARCHAR(255),
    postal_code VARCHAR(50),
    items TEXT NOT NULL, -- JSON array
    total_amount REAL NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    comment TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS shop_order_email ON shop_order(email);
CREATE INDEX IF NOT EXISTS shop_order_status ON shop_order(status);
CREATE INDEX IF NOT EXISTS shop_order_created_at ON shop_order(created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS shop_order;
DROP TABLE IF EXISTS shop_product;
DROP TABLE IF EXISTS shop_category;
