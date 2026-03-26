package expenses

import (
	"time"

	"gorm.io/gorm"
)

type Expense struct {
	ID            uint           `json:"id" gorm:"primaryKey;type:bigint"`
	ExpenseTypeID uint           `json:"expense_type_id" gorm:"type:bigint;not null;index"`
	WalletID      *uint          `json:"wallet_id" gorm:"type:bigint;index"`
	PaymentID     *uint          `json:"payment_id" gorm:"type:bigint;index"`
	Amount        float64        `json:"amount" gorm:"type:numeric(12,2);not null"`
	Date          time.Time      `json:"date" gorm:"type:date;not null;index"`
	Note          string         `json:"note" gorm:"type:text"`
	UserID        uint           `json:"user_id" gorm:"type:bigint;not null;index"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	ExpenseType ExpenseType `json:"expense_type,omitempty" gorm:"foreignKey:ExpenseTypeID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Wallet      Wallet      `json:"wallet,omitempty" gorm:"foreignKey:WalletID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	Payment     Payment     `json:"payment,omitempty" gorm:"foreignKey:PaymentID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}
