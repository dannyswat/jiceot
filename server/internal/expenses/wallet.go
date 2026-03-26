package expenses

import (
	"time"

	"gorm.io/gorm"
)

const (
	WalletPeriodNone         = "none"
	WalletPeriodMonthly      = "monthly"
	WalletPeriodBimonthly    = "bimonthly"
	WalletPeriodQuarterly    = "quarterly"
	WalletPeriodFourMonths   = "fourmonths"
	WalletPeriodSemiannually = "semiannually"
	WalletPeriodAnnually     = "annually"
)

type Wallet struct {
	ID                   uint           `json:"id" gorm:"primaryKey;type:bigint"`
	Name                 string         `json:"name" gorm:"type:varchar(255);not null"`
	Icon                 string         `json:"icon" gorm:"type:varchar(50)"`
	Color                string         `json:"color" gorm:"type:varchar(10)"`
	Description          string         `json:"description" gorm:"type:text"`
	IsCredit             bool           `json:"is_credit" gorm:"not null;default:false"`
	IsCash               bool           `json:"is_cash" gorm:"not null;default:false;check:chk_wallet_type,NOT (is_credit AND is_cash)"`
	BillPeriod           string         `json:"bill_period" gorm:"type:varchar(20);not null;default:'none';check:chk_wallet_bill_period,bill_period IN ('none','monthly','bimonthly','quarterly','fourmonths','semiannually','annually')"`
	BillDueDay           int            `json:"bill_due_day" gorm:"not null;default:0"`
	Stopped              bool           `json:"stopped" gorm:"not null;default:false"`
	DefaultExpenseTypeID *uint          `json:"default_expense_type_id" gorm:"type:bigint;index"`
	UserID               uint           `json:"user_id" gorm:"type:bigint;not null;index"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
	DeletedAt            gorm.DeletedAt `json:"-" gorm:"index"`

	DefaultExpenseType *ExpenseType `json:"default_expense_type,omitempty" gorm:"foreignKey:DefaultExpenseTypeID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
}
