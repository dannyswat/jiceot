package expenses

import (
	"math/big"
	"time"

	"gorm.io/gorm"
)

type BillType struct {
	ID            uint           `json:"id" gorm:"primaryKey"`
	Name          string         `json:"name" gorm:"not null"`
	Icon          string         `json:"icon"`
	Color         string         `json:"color"`                                  // hex color code
	BillDay       int            `json:"bill_day"`                               // day of month, 0 means no specific day
	BillCycle     int            `json:"bill_cycle"`                             // in months, 0 means one-time
	FixedAmount   string         `json:"fixed_amount" gorm:"type:decimal(10,2)"` // Store as string for precision
	Stopped       bool           `json:"stopped" gorm:"default:false"`
	ExpenseTypeID *uint          `json:"expense_type_id" gorm:"index"` // optional, can be null
	UserID        uint           `json:"user_id" gorm:"not null;index"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `json:"-" gorm:"index"`
}

// GetFixedAmountAsBigFloat converts the stored string amount to big.Float
func (bt *BillType) GetFixedAmountAsBigFloat() *big.Float {
	amount := new(big.Float)
	amount.SetString(bt.FixedAmount)
	return amount
}

// SetFixedAmountFromBigFloat sets the amount from a big.Float
func (bt *BillType) SetFixedAmountFromBigFloat(amount *big.Float) {
	bt.FixedAmount = amount.String()
}
