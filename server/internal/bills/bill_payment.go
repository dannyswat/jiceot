package bills

import (
	"math/big"
	"time"

	"gorm.io/gorm"
)

type BillPayment struct {
	ID         uint           `json:"id" gorm:"primaryKey"`
	BillTypeID uint           `json:"bill_type_id" gorm:"not null;index"`
	Year       int            `json:"year" gorm:"not null"`                      // format: YYYY
	Month      int            `json:"month" gorm:"not null"`                     // format: MM
	Amount     string         `json:"amount" gorm:"type:decimal(10,2);not null"` // Store as string for precision
	Note       string         `json:"note"`
	UserID     uint           `json:"user_id" gorm:"not null;index"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `json:"-" gorm:"index"`

	// Associations
	BillType BillType `json:"bill_type,omitempty" gorm:"foreignKey:BillTypeID"`
}

// GetAmountAsBigFloat converts the stored string amount to big.Float
func (bp *BillPayment) GetAmountAsBigFloat() *big.Float {
	amount := new(big.Float)
	amount.SetString(bp.Amount)
	return amount
}

// SetAmountFromBigFloat sets the amount from a big.Float
func (bp *BillPayment) SetAmountFromBigFloat(amount *big.Float) {
	bp.Amount = amount.String()
}
