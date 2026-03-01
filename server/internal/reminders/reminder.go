package reminders

import (
	"time"

	"gorm.io/gorm"
)

// RecurrenceType defines the supported recurrence patterns
type RecurrenceType string

const (
	RecurrenceNone    RecurrenceType = "none"    // One-time reminder
	RecurrenceDaily   RecurrenceType = "daily"   // Every N days
	RecurrenceWeekly  RecurrenceType = "weekly"  // Every N weeks, on specific days
	RecurrenceMonthly RecurrenceType = "monthly" // Every N months, on specific day
	RecurrenceYearly  RecurrenceType = "yearly"  // Every N years, on specific month/day
)

// Reminder represents a user reminder (one-time or recurring)
type Reminder struct {
	ID    uint   `json:"id" gorm:"primaryKey"`
	Title string `json:"title" gorm:"not null"`
	// Detail is the body text of the reminder
	Detail string `json:"detail"`

	// Timezone stores the IANA timezone used for recurrence calculations
	// (e.g. "America/New_York").
	Timezone string `json:"timezone" gorm:"type:varchar(100);not null;default:'UTC'"`

	// RemindAt is the initial/one-time reminder datetime (user-specified)
	RemindAt time.Time `json:"remind_at" gorm:"not null"`

	// RemindHour is the hour (0-23) at which the reminder should fire.
	// For recurring reminders this determines the daily trigger time.
	RemindHour int `json:"remind_hour" gorm:"not null;default:9"`

	// Recurrence fields
	RecurrenceType     RecurrenceType `json:"recurrence_type" gorm:"type:varchar(20);not null;default:'none'"`
	RecurrenceInterval int            `json:"recurrence_interval" gorm:"not null;default:1"` // every N periods

	// RecurrenceDaysOfWeek: comma-separated days for weekly recurrence.
	// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
	// e.g. "1,3,5" means Mon, Wed, Fri
	RecurrenceDaysOfWeek string `json:"recurrence_days_of_week" gorm:"type:varchar(20)"`

	// RecurrenceDayOfMonth: day of month for monthly recurrence (1-31).
	// 0 means last day of month.
	RecurrenceDayOfMonth int `json:"recurrence_day_of_month" gorm:"default:0"`

	// RecurrenceMonthOfYear: month for yearly recurrence (1-12)
	RecurrenceMonthOfYear int `json:"recurrence_month_of_year" gorm:"default:0"`

	// RecurrenceEndDate: optional end date for recurring reminders (nullable)
	RecurrenceEndDate *time.Time `json:"recurrence_end_date"`

	// NextRemindAt is the pre-computed next trigger time. Indexed for efficient querying.
	// The background service only checks: WHERE is_active = true AND next_remind_at <= NOW()
	NextRemindAt time.Time `json:"next_remind_at" gorm:"not null;index"`

	// LastRemindedAt tracks when the reminder was last triggered
	LastRemindedAt *time.Time `json:"last_reminded_at"`

	// IsActive indicates whether the reminder is still active
	IsActive bool `json:"is_active" gorm:"not null;default:true;index"`

	// CompletedAt is set when a one-time reminder fires or a recurring reminder is manually completed
	CompletedAt *time.Time `json:"completed_at"`

	UserID    uint           `json:"user_id" gorm:"not null;index"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
