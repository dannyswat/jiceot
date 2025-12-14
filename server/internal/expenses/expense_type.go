package expenses

import (
	"math/big"
	"time"

	"gorm.io/gorm"
)

type ExpenseType struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	Name              string         `json:"name" gorm:"not null"`
	Icon              string         `json:"icon"`
	Color             string         `json:"color"`                                  // hex color code
	BillDay           int            `json:"bill_day"`                               // day of month, 0 means no specific day
	BillCycle         int            `json:"bill_cycle"`                             // in months, 0 means on-demand
	FixedAmount       string         `json:"fixed_amount" gorm:"type:decimal(10,2)"` // Store as string for precision
	DefaultBillTypeID *uint          `json:"default_bill_type_id" gorm:"index"`      // optional default bill type for expenses
	UserID            uint           `json:"user_id" gorm:"not null;index"`          // owner
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`
}

// GetFixedAmountAsBigFloat converts the stored string amount to big.Float
func (et *ExpenseType) GetFixedAmountAsBigFloat() *big.Float {
	amount := new(big.Float)
	amount.SetString(et.FixedAmount)
	return amount
}
