package model

import (
	"time"
)

// DeviceAuthStatus represents the status of a device authorization request
type DeviceAuthStatus string

const (
	DeviceAuthStatusPending DeviceAuthStatus = "pending"
	DeviceAuthStatusGranted DeviceAuthStatus = "granted"
	DeviceAuthStatusDenied  DeviceAuthStatus = "denied"
	DeviceAuthStatusExpired DeviceAuthStatus = "expired"
)

// DeviceAuth represents a device authorization request for QR login
type DeviceAuth struct {
	DeviceCode string           `structs:"device_code" json:"device_code"`
	UserCode   string           `structs:"user_code" json:"user_code"`
	UserID     string           `structs:"user_id" json:"user_id,omitempty"`
	Status     DeviceAuthStatus `structs:"status" json:"status"`
	ClientIP   string           `structs:"client_ip" json:"client_ip,omitempty"`
	UserAgent  string           `structs:"user_agent" json:"user_agent,omitempty"`
	CreatedAt  time.Time        `structs:"created_at" json:"created_at"`
	ExpiresAt  time.Time        `structs:"expires_at" json:"expires_at"`
	GrantedAt  *time.Time       `structs:"granted_at" json:"granted_at,omitempty"`
}

// IsExpired checks if the device auth request has expired
func (d *DeviceAuth) IsExpired() bool {
	return time.Now().After(d.ExpiresAt)
}

// DeviceAuthRepository interface for device auth operations
type DeviceAuthRepository interface {
	// Create a new device auth request
	Put(auth *DeviceAuth) error

	// Get by device code (used by TV polling)
	GetByDeviceCode(deviceCode string) (*DeviceAuth, error)

	// Get by user code (used when mobile scans QR)
	GetByUserCode(userCode string) (*DeviceAuth, error)

	// Update status (grant/deny)
	UpdateStatus(deviceCode string, status DeviceAuthStatus, userID string) error

	// Delete expired entries
	Cleanup() error
}
