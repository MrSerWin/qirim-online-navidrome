-- +goose Up
-- Table for device authorization (QR login)
-- Note: No foreign key on user_id because it can be NULL until granted
CREATE TABLE IF NOT EXISTS device_auth (
    device_code VARCHAR(64) NOT NULL PRIMARY KEY,
    user_code VARCHAR(8) NOT NULL UNIQUE,
    user_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    client_ip VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    granted_at DATETIME
);

-- Index for user_code lookup (when mobile scans QR)
CREATE INDEX IF NOT EXISTS idx_device_auth_user_code ON device_auth(user_code);

-- Index for cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_device_auth_expires ON device_auth(expires_at);

-- Index for status lookup
CREATE INDEX IF NOT EXISTS idx_device_auth_status ON device_auth(status);

-- +goose Down
DROP INDEX IF EXISTS idx_device_auth_status;
DROP INDEX IF EXISTS idx_device_auth_expires;
DROP INDEX IF EXISTS idx_device_auth_user_code;
DROP TABLE IF EXISTS device_auth;
