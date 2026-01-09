package persistence

import (
	"context"
	"time"

	. "github.com/Masterminds/squirrel"
	"github.com/navidrome/navidrome/model"
	"github.com/pocketbase/dbx"
)

type deviceAuthRepository struct {
	sqlRepository
}

func NewDeviceAuthRepository(ctx context.Context, db dbx.Builder) model.DeviceAuthRepository {
	r := &deviceAuthRepository{}
	r.ctx = ctx
	r.db = db
	r.tableName = "device_auth"
	return r
}

func (r *deviceAuthRepository) Put(auth *model.DeviceAuth) error {
	_, err := r.executeSQL(Insert(r.tableName).SetMap(map[string]interface{}{
		"device_code": auth.DeviceCode,
		"user_code":   auth.UserCode,
		"user_id":     auth.UserID,
		"status":      auth.Status,
		"client_ip":   auth.ClientIP,
		"user_agent":  auth.UserAgent,
		"created_at":  auth.CreatedAt,
		"expires_at":  auth.ExpiresAt,
		"granted_at":  auth.GrantedAt,
	}))
	return err
}

func (r *deviceAuthRepository) GetByDeviceCode(deviceCode string) (*model.DeviceAuth, error) {
	sq := Select("*").From(r.tableName).Where(Eq{"device_code": deviceCode})
	var res model.DeviceAuth
	err := r.queryOne(sq, &res)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *deviceAuthRepository) GetByUserCode(userCode string) (*model.DeviceAuth, error) {
	sq := Select("*").From(r.tableName).Where(Eq{"user_code": userCode})
	var res model.DeviceAuth
	err := r.queryOne(sq, &res)
	if err != nil {
		return nil, err
	}
	return &res, nil
}

func (r *deviceAuthRepository) UpdateStatus(deviceCode string, status model.DeviceAuthStatus, userID string) error {
	updateMap := map[string]interface{}{
		"status": status,
	}
	if userID != "" {
		updateMap["user_id"] = userID
	}
	if status == model.DeviceAuthStatusGranted {
		now := time.Now()
		updateMap["granted_at"] = now
	}

	_, err := r.executeSQL(Update(r.tableName).
		SetMap(updateMap).
		Where(Eq{"device_code": deviceCode}))
	return err
}

func (r *deviceAuthRepository) Cleanup() error {
	_, err := r.executeSQL(Delete(r.tableName).Where(Lt{"expires_at": time.Now()}))
	return err
}

var _ model.DeviceAuthRepository = (*deviceAuthRepository)(nil)
