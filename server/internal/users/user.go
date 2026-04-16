package users

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID               uint           `json:"id" gorm:"primaryKey;type:bigint"`
	Email            string         `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash     string         `json:"-" gorm:"not null"`
	Name             string         `json:"name" gorm:"not null"`
	CurrencySymbol   string         `json:"currency_symbol" gorm:"type:varchar(8);not null;default:'$'"`
	Language         string         `json:"language" gorm:"type:varchar(16);not null;default:'en'"`
	AutomationAPIKey string         `json:"automation_api_key" gorm:"type:varchar(64);uniqueIndex;not null;default:''"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

func (u *User) BeforeCreate(*gorm.DB) error {
	u.ensureAutomationAPIKey()
	return nil
}

func (u *User) BeforeSave(*gorm.DB) error {
	u.ensureAutomationAPIKey()
	return nil
}

func (u *User) ensureAutomationAPIKey() {
	if u.AutomationAPIKey != "" {
		return
	}
	u.AutomationAPIKey = generateAutomationAPIKey()
}

func generateAutomationAPIKey() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		panic("failed to generate automation API key: " + err.Error())
	}
	return hex.EncodeToString(bytes)
}
