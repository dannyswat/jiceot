package users

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID             uint           `json:"id" gorm:"primaryKey;type:bigint"`
	Email          string         `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash   string         `json:"-" gorm:"not null"`
	Name           string         `json:"name" gorm:"not null"`
	CurrencySymbol string         `json:"currency_symbol" gorm:"type:varchar(8);not null;default:'$'"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`
}
