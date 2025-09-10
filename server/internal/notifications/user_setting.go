package notifications

import (
	"time"
)

type UserNotificationSetting struct {
	ID               uint      `json:"id" gorm:"primaryKey"`
	UserID           uint      `json:"user_id" gorm:"not null;index"`
	BarkApiUrl       string    `json:"bark_api_url" gorm:"not null"`
	BarkEnabled      bool      `json:"bark_enabled" gorm:"not null;default:false"`
	RemindHour       int       `json:"remind_hour" gorm:"not null;default:0"` // 0 - 23
	RemindDaysBefore int       `json:"remind_days_before" gorm:"not null;default:0"`
	CreatedAt        time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt        time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}
