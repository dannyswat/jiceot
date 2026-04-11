package expenses

import (
	"fmt"
	"math/big"
	"strconv"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	RecurringTypeNone     = "none"
	RecurringTypeFixedDay = "fixed_day"
	RecurringTypeFlexible = "flexible"

	RecurringPeriodNone         = "none"
	RecurringPeriodWeekly       = "weekly"
	RecurringPeriodBiweekly     = "biweekly"
	RecurringPeriodMonthly      = "monthly"
	RecurringPeriodBimonthly    = "bimonthly"
	RecurringPeriodQuarterly    = "quarterly"
	RecurringPeriodFourMonths   = "fourmonths"
	RecurringPeriodSemiannually = "semiannually"
	RecurringPeriodAnnually     = "annually"
)

type ExpenseType struct {
	ID              uint           `json:"id" gorm:"primaryKey;type:bigint"`
	ParentID        *uint          `json:"parent_id" gorm:"type:bigint;index"`
	Name            string         `json:"name" gorm:"type:varchar(255);not null"`
	Icon            string         `json:"icon" gorm:"type:varchar(50)"`
	Color           string         `json:"color" gorm:"type:varchar(10)"`
	Description     string         `json:"description" gorm:"type:text"`
	DefaultAmount   float64        `json:"default_amount" gorm:"type:numeric(12,2);not null;default:0"`
	DefaultWalletID *uint          `json:"default_wallet_id" gorm:"type:bigint;index"`
	RecurringType   string         `json:"recurring_type" gorm:"type:varchar(20);not null;default:'none';check:chk_expense_type_recurring_type,recurring_type IN ('none','fixed_day','flexible')"`
	RecurringPeriod string         `json:"recurring_period" gorm:"type:varchar(20);not null;default:'none';check:chk_expense_type_recurring_period,recurring_period IN ('none','weekly','biweekly','monthly','bimonthly','quarterly','fourmonths','semiannually','annually')"`
	RecurringDueDay int            `json:"recurring_due_day" gorm:"not null;default:0"`
	Automatic       bool           `json:"automatic" gorm:"not null;default:false"`
	NextDueDay      *time.Time     `json:"next_due_day" gorm:"type:date;index"`
	Stopped         bool           `json:"stopped" gorm:"not null;default:false"`
	UserID          uint           `json:"user_id" gorm:"type:bigint;not null;index"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"-" gorm:"index"`

	Parent        *ExpenseType `json:"parent,omitempty" gorm:"foreignKey:ParentID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`
	DefaultWallet *Wallet      `json:"default_wallet,omitempty" gorm:"foreignKey:DefaultWalletID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;"`

	BillDay           int    `json:"bill_day,omitempty" gorm:"-"`
	BillCycle         int    `json:"bill_cycle,omitempty" gorm:"-"`
	FixedAmount       string `json:"fixed_amount,omitempty" gorm:"-"`
	DefaultBillTypeID *uint  `json:"default_bill_type_id,omitempty" gorm:"-"`
}

func (et *ExpenseType) AfterFind(*gorm.DB) error {
	et.syncLegacyFields()
	return nil
}

func (et *ExpenseType) BeforeCreate(*gorm.DB) error {
	et.syncFromLegacyFields()
	return nil
}

func (et *ExpenseType) BeforeSave(*gorm.DB) error {
	et.syncFromLegacyFields()
	return nil
}

// GetFixedAmountAsBigFloat preserves the legacy amount helper while the API layer is migrated.
func (et *ExpenseType) GetFixedAmountAsBigFloat() *big.Float {
	amount := new(big.Float)
	amount.SetString(et.currentFixedAmountString())
	return amount
}

func (et *ExpenseType) syncLegacyFields() {
	et.BillDay = et.RecurringDueDay
	et.BillCycle = legacyMonthsFromRecurring(et.RecurringType, et.RecurringPeriod)
	et.FixedAmount = et.currentFixedAmountString()
	et.DefaultBillTypeID = et.DefaultWalletID
}

func (et *ExpenseType) syncFromLegacyFields() {
	if et.DefaultWalletID == nil && et.DefaultBillTypeID != nil {
		et.DefaultWalletID = et.DefaultBillTypeID
	}

	if et.DefaultAmount == 0 {
		if parsedAmount, err := strconv.ParseFloat(strings.TrimSpace(et.FixedAmount), 64); err == nil {
			et.DefaultAmount = parsedAmount
		}
	}

	if et.RecurringType == "" {
		if et.BillCycle > 0 {
			et.RecurringType, et.RecurringPeriod = recurrenceFromLegacyCycle(et.BillDay, et.BillCycle)
		} else {
			et.RecurringType = RecurringTypeNone
			et.RecurringPeriod = RecurringPeriodNone
		}
	}

	if et.RecurringPeriod == "" {
		et.RecurringPeriod = RecurringPeriodNone
	}

	if et.RecurringDueDay == 0 && et.BillDay > 0 {
		et.RecurringDueDay = et.BillDay
	}

	et.syncLegacyFields()
}

func (et *ExpenseType) currentFixedAmountString() string {
	if strings.TrimSpace(et.FixedAmount) != "" {
		return strings.TrimSpace(et.FixedAmount)
	}
	return fmt.Sprintf("%.2f", et.DefaultAmount)
}

func legacyMonthsFromRecurring(recurringType, recurringPeriod string) int {
	if recurringType == RecurringTypeNone {
		return 0
	}

	switch recurringPeriod {
	case RecurringPeriodMonthly:
		return 1
	case RecurringPeriodBimonthly:
		return 2
	case RecurringPeriodQuarterly:
		return 3
	case RecurringPeriodFourMonths:
		return 4
	case RecurringPeriodSemiannually:
		return 6
	case RecurringPeriodAnnually:
		return 12
	default:
		return 0
	}
}

func recurrenceFromLegacyCycle(billDay, billCycle int) (string, string) {
	if billCycle <= 0 {
		return RecurringTypeNone, RecurringPeriodNone
	}

	recurringType := RecurringTypeFlexible
	if billDay > 0 {
		recurringType = RecurringTypeFixedDay
	}

	switch billCycle {
	case 1:
		return recurringType, RecurringPeriodMonthly
	case 2:
		return recurringType, RecurringPeriodBimonthly
	case 3:
		return recurringType, RecurringPeriodQuarterly
	case 4:
		return recurringType, RecurringPeriodFourMonths
	case 6:
		return recurringType, RecurringPeriodSemiannually
	case 12:
		return recurringType, RecurringPeriodAnnually
	default:
		return recurringType, RecurringPeriodNone
	}
}
