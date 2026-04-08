package expenses

import (
	"time"

	"gorm.io/gorm"
)

type Payment struct {
	ID        uint           `json:"id" gorm:"primaryKey;type:bigint"`
	WalletID  uint           `json:"wallet_id" gorm:"type:bigint;not null;index"`
	Amount    float64        `json:"amount" gorm:"type:numeric(12,2);not null"`
	Date      time.Time      `json:"date" gorm:"type:date;not null;index"`
	Note      string         `json:"note" gorm:"type:text"`
	UserID    uint           `json:"user_id" gorm:"type:bigint;not null;index"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	Wallet   Wallet                  `json:"wallet,omitempty" gorm:"foreignKey:WalletID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	Expenses []PaymentExpenseSummary `json:"expenses,omitempty" gorm:"-"`
}

type PaymentExpenseTypeSummary struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type PaymentExpenseSummary struct {
	ID            uint                      `json:"id"`
	PaymentID     uint                      `json:"payment_id"`
	ExpenseTypeID uint                      `json:"expense_type_id"`
	Amount        float64                   `json:"amount"`
	ExpenseType   PaymentExpenseTypeSummary `json:"expense_type"`
}
