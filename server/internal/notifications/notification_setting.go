package notifications

import (
	"time"

	"gorm.io/gorm"
)

type NotificationSetting struct {
	ID             uint           `json:"id" gorm:"primaryKey;type:bigint"`
	UserID         uint           `json:"user_id" gorm:"type:bigint;not null;uniqueIndex"`
	BarkURL        string         `json:"bark_url" gorm:"type:varchar(500)"`
	Enabled        bool           `json:"enabled" gorm:"not null;default:false"`
	ReminderTime   string         `json:"reminder_time" gorm:"type:varchar(5);not null;default:''"` // HH:MM
	Timezone       string         `json:"timezone" gorm:"type:varchar(100);not null;default:''"`
	DueDaysAhead   int            `json:"due_days_ahead" gorm:"not null;default:3"`
	LastNotifiedAt *time.Time     `json:"last_notified_at" gorm:"type:timestamptz"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}
