package users

import (
	"time"

	"gorm.io/gorm"
)

type UserDevice struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	UserID       uint           `json:"user_id" gorm:"not null;index"`
	User         *User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	RefreshToken string         `json:"-" gorm:"uniqueIndex;not null"` // Hidden from JSON
	DeviceName   string         `json:"device_name" gorm:"not null"`
	DeviceType   string         `json:"device_type"` // e.g., "web", "ios", "android"
	IpAddress    string         `json:"ip_address"`
	UserAgent    string         `json:"user_agent"`
	LastUsedAt   time.Time      `json:"last_used_at"`
	ExpiresAt    time.Time      `json:"expires_at" gorm:"not null;index"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName overrides the table name
func (UserDevice) TableName() string {
	return "user_devices"
}

type UserDeviceResponse struct {
	ID         uint      `json:"id"`
	DeviceName string    `json:"device_name"`
	DeviceType string    `json:"device_type"`
	IpAddress  string    `json:"ip_address"`
	LastUsedAt time.Time `json:"last_used_at"`
	CreatedAt  time.Time `json:"created_at"`
	IsCurrent  bool      `json:"is_current"`
}
