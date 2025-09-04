package expenses

import (
	"math/big"
	"time"

	"gorm.io/gorm"
)

type ExpenseItem struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	BillPaymentID *uint          `json:"bill_payment_id" gorm:"index"` // optional, can be null
	ExpenseTypeID uint           `json:"expense_type_id" gorm:"not null;index"`
	Year          int            `json:"year" gorm:"not null"`                      // format: YYYY
	Month         int            `json:"month" gorm:"not null"`                     // format: MM
	Amount        string         `json:"amount" gorm:"type:decimal(10,2);not null"` // Store as string for precision
	Note          string         `json:"note"`
	UserID        uint           `json:"user_id" gorm:"not null;index"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`

	// Associations
	ExpenseType ExpenseType `json:"expense_type,omitempty" gorm:"foreignKey:ExpenseTypeID"`
	BillPayment BillPayment `json:"bill_payment,omitempty" gorm:"foreignKey:BillPaymentID"`
}

// GetAmountAsBigFloat converts the stored string amount to big.Float
func (ei *ExpenseItem) GetAmountAsBigFloat() *big.Float {
	amount := new(big.Float)
	amount.SetString(ei.Amount)
	return amount
}

// SetAmountFromBigFloat sets the amount from a big.Float
func (ei *ExpenseItem) SetAmountFromBigFloat(amount *big.Float) {
	ei.Amount = amount.String()
}
