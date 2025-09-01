package expenses

import (
	"time"

	"gorm.io/gorm"
)

type ExpenseType struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Name      string         `json:"name" gorm:"not null"`
	Icon      string         `json:"icon"`
	Color     string         `json:"color"`                         // hex color code
	UserID    uint           `json:"user_id" gorm:"not null;index"` // owner
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
