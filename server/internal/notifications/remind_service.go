package notifications

import (
	"context"
	"fmt"
	"log"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

// DueReminder represents a reminder that is due for notification
type DueReminder struct {
	ID     uint
	UserID uint
	Title  string
	Detail string
}

// ReminderChecker is an interface for checking and processing due reminders.
// This avoids circular imports between notifications and reminders packages.
type ReminderChecker interface {
	GetDueRemindersForNotification(now time.Time) ([]DueReminder, error)
	MarkRemindedByID(reminderID uint) error
}

type RemindService struct {
	db              *gorm.DB
	cancel          context.CancelFunc
	reminderChecker ReminderChecker
}

func NewRemindService(db *gorm.DB) *RemindService {
	return &RemindService{
		db: db,
	}
}

// StartBackgroundReminders starts the background service that runs every hour
func (s *RemindService) StartBackgroundReminders(reminderChecker ReminderChecker) {
	s.reminderChecker = reminderChecker
	ctx, cancel := context.WithCancel(context.Background())
	s.cancel = cancel

	log.Println("Starting background reminder service...")

	// Create a ticker that runs every hour
	ticker := time.NewTicker(1 * time.Hour)

	// Run immediately on start
	go func() {
		s.checkAndSendReminders()
	}()

	// Then run every hour
	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				log.Println("Background reminder service stopped")
				return
			case <-ticker.C:
				s.checkAndSendReminders()
			}
		}
	}()
}

// StopBackgroundReminders stops the background service
func (s *RemindService) StopBackgroundReminders() {
	if s.cancel != nil {
		s.cancel()
	}
}

// checkAndSendReminders checks all user settings and sends reminders if needed
func (s *RemindService) checkAndSendReminders() {
	nowUTC := time.Now().UTC()

	log.Printf("Checking reminders at %s", nowUTC.Format(time.RFC3339))

	// 1. Process bill due reminders (timezone-aware per user setting)
	var settings []UserNotificationSetting
	if err := s.db.Where("bark_enabled = ?", true).Find(&settings).Error; err != nil {
		log.Printf("Error fetching notification settings: %v", err)
		return
	}

	eligibleSettings := make([]UserNotificationSetting, 0, len(settings))
	for _, setting := range settings {
		loc := notificationLocation(setting.Timezone)
		currentHour := nowUTC.In(loc).Hour()
		if currentHour == setting.RemindHour {
			eligibleSettings = append(eligibleSettings, setting)
		}
	}

	log.Printf("Found %d users with notifications enabled for their local reminder hour", len(eligibleSettings))

	for _, setting := range eligibleSettings {
		if err := s.processUserReminders(setting, nowUTC); err != nil {
			log.Printf("Error processing reminders for user %d: %v", setting.UserID, err)
		}
	}

	// 2. Process user-created reminders (only checks next_remind_at <= now, very efficient)
	if s.reminderChecker != nil {
		s.processUserCreatedReminders(nowUTC)
	}
}

// processUserReminders processes reminders for a single user
func (s *RemindService) processUserReminders(setting UserNotificationSetting, nowUTC time.Time) error {
	loc := notificationLocation(setting.Timezone)
	now := nowUTC.In(loc)

	log.Printf("Processing reminders for user %d: checking bills due in %d days",
		setting.UserID, setting.RemindDaysBefore)

	// Find all active bill types for this user (including those with bill_day = 0)
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ? AND stopped = ? AND bill_cycle > 0", setting.UserID, false).Find(&billTypes).Error; err != nil {
		return fmt.Errorf("failed to fetch bill types: %w", err)
	}

	var billsDue []BillDue

	for _, billType := range billTypes {
		// Skip if bill cycle is 0 (on-demand bills)
		if billType.BillCycle == 0 {
			continue
		}

		// Get the most recent payment for this bill type
		var lastPayment expenses.BillPayment
		result := s.db.Where("bill_type_id = ? AND user_id = ?", billType.ID, setting.UserID).
			Order("year DESC, month DESC").First(&lastPayment)

		// Calculate next due date based on bill cycle
		var nextDueDate time.Time
		if result.Error == gorm.ErrRecordNotFound {
			// No payment exists, bill is due in current month/cycle
			if billType.BillDay > 0 {
				nextDueDate = dateWithClampedDay(now.Year(), now.Month(), billType.BillDay, loc)
				// If the bill day has already passed this month, move to next cycle
				if nextDueDate.Before(now) {
					nextDueDate = s.calculateNextDueDateFromDate(nextDueDate, billType.BillCycle)
				}
			} else {
				// No specific day, use end of current month
				nextDueDate = time.Date(now.Year(), now.Month()+1, 0, 23, 59, 59, 0, loc)
			}
		} else if result.Error != nil {
			log.Printf("Error fetching last payment for bill type %d: %v", billType.ID, result.Error)
			continue
		} else {
			// Calculate next due date based on last payment + bill cycle
			nextDueDate = s.calculateNextDueDateFromPayment(lastPayment, billType, loc)
		}

		// Check if the bill is due within the reminder window
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)
		if daysUntilDue <= setting.RemindDaysBefore && daysUntilDue >= 0 {
			// Check if there's already a payment for the next due period
			targetYear := nextDueDate.Year()
			targetMonth := int(nextDueDate.Month())

			var existingPayment expenses.BillPayment
			paymentResult := s.db.Where("bill_type_id = ? AND year = ? AND month = ? AND user_id = ?",
				billType.ID, targetYear, targetMonth, setting.UserID).First(&existingPayment)

			// If no payment exists for this due period, add to bills due
			if paymentResult.Error == gorm.ErrRecordNotFound {
				billsDue = append(billsDue, BillDue{
					BillType: billType,
					DueDate:  nextDueDate,
					Amount:   billType.FixedAmount,
				})
			}
		}
	}

	// Send notification if there are bills due
	if len(billsDue) > 0 {
		return s.sendReminderNotification(setting, billsDue)
	}

	log.Printf("No bills due for user %d", setting.UserID)
	return nil
}

// calculateNextDueDateFromPayment calculates the next due date based on the last payment and bill cycle
func (s *RemindService) calculateNextDueDateFromPayment(lastPayment expenses.BillPayment, billType expenses.BillType, loc *time.Location) time.Time {
	// Start from the last payment's month/year
	nextYear := lastPayment.Year
	nextMonth := lastPayment.Month + billType.BillCycle

	// Handle year overflow
	for nextMonth > 12 {
		nextYear++
		nextMonth -= 12
	}

	// Set the due date
	if billType.BillDay > 0 {
		// Get the last day of the target month to handle cases where bill_day > days in month
		lastDayOfMonth := time.Date(nextYear, time.Month(nextMonth+1), 0, 0, 0, 0, 0, loc).Day()
		billDay := billType.BillDay
		if billDay > lastDayOfMonth {
			billDay = lastDayOfMonth
		}
		return time.Date(nextYear, time.Month(nextMonth), billDay, 0, 0, 0, 0, loc)
	} else {
		// No specific day, use end of month
		return time.Date(nextYear, time.Month(nextMonth+1), 0, 23, 59, 59, 0, loc)
	}
}

// calculateNextDueDateFromDate adds the bill cycle (in months) to the given date
func (s *RemindService) calculateNextDueDateFromDate(date time.Time, billCycle int) time.Time {
	nextYear := date.Year()
	nextMonth := int(date.Month()) + billCycle

	// Handle year overflow
	for nextMonth > 12 {
		nextYear++
		nextMonth -= 12
	}

	return time.Date(nextYear, time.Month(nextMonth), date.Day(), date.Hour(), date.Minute(), date.Second(), date.Nanosecond(), date.Location())
}

// BillDue represents a bill that is due soon
type BillDue struct {
	BillType expenses.BillType
	DueDate  time.Time
	Amount   string
}

// sendReminderNotification sends a notification via Bark
func (s *RemindService) sendReminderNotification(setting UserNotificationSetting, billsDue []BillDue) error {
	title := "📋 Bills Due Reminder"

	var body string
	if len(billsDue) == 1 {
		bill := billsDue[0]
		cycleDesc := s.getCycleDescription(bill.BillType.BillCycle)
		body = fmt.Sprintf("You have 1 %s bill due on %s:\n\n• %s",
			cycleDesc,
			bill.DueDate.Format("Jan 2, 2006"),
			bill.BillType.Name)
		if bill.Amount != "" && bill.Amount != "0" {
			body += fmt.Sprintf(" - $%s", bill.Amount)
		}
	} else {
		body = fmt.Sprintf("You have %d bills due soon:\n\n", len(billsDue))
		for i, bill := range billsDue {
			if i < 5 { // Limit to first 5 bills to keep notification readable
				cycleDesc := s.getCycleDescription(bill.BillType.BillCycle)
				body += fmt.Sprintf("• %s (%s) - %s",
					bill.BillType.Name,
					cycleDesc,
					bill.DueDate.Format("Jan 2"))
				if bill.Amount != "" && bill.Amount != "0" {
					body += fmt.Sprintf(" - $%s", bill.Amount)
				}
				body += "\n"
			} else if i == 5 {
				body += fmt.Sprintf("• ...and %d more bills", len(billsDue)-5)
				break
			}
		}
	}

	log.Printf("Sending notification to user %d: %d bills due", setting.UserID, len(billsDue))

	if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
		return fmt.Errorf("failed to send bark notification: %w", err)
	}

	log.Printf("Successfully sent reminder notification to user %d", setting.UserID)
	return nil
}

// getCycleDescription returns a human-readable description of the bill cycle
func (s *RemindService) getCycleDescription(billCycle int) string {
	switch billCycle {
	case 1:
		return "monthly"
	case 2:
		return "bi-monthly"
	case 3:
		return "quarterly"
	case 4:
		return "every 4 months"
	case 6:
		return "semi-annual"
	case 12:
		return "annual"
	default:
		if billCycle > 12 {
			return fmt.Sprintf("every %d years", billCycle/12)
		}
		return fmt.Sprintf("every %d months", billCycle)
	}
}

func dateWithClampedDay(year int, month time.Month, day int, loc *time.Location) time.Time {
	lastDayOfMonth := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	if day > lastDayOfMonth {
		day = lastDayOfMonth
	}
	return time.Date(year, month, day, 0, 0, 0, 0, loc)
}

// processUserCreatedReminders checks for due user-created reminders and sends notifications.
// This is very efficient: it only queries reminders with next_remind_at <= now.
func (s *RemindService) processUserCreatedReminders(now time.Time) {
	dueReminders, err := s.reminderChecker.GetDueRemindersForNotification(now)
	if err != nil {
		log.Printf("Error fetching due user reminders: %v", err)
		return
	}

	if len(dueReminders) == 0 {
		return
	}

	log.Printf("Found %d due user reminders", len(dueReminders))

	// Group reminders by user
	userReminders := make(map[uint][]DueReminder)
	for _, r := range dueReminders {
		userReminders[r.UserID] = append(userReminders[r.UserID], r)
	}

	for userID, reminders := range userReminders {
		// Get user's notification settings
		var setting UserNotificationSetting
		if err := s.db.Where("user_id = ? AND bark_enabled = ?", userID, true).First(&setting).Error; err != nil {
			log.Printf("No enabled notification settings for user %d, skipping user reminders", userID)
			// Still mark reminders as reminded so they advance to next occurrence
			for _, r := range reminders {
				if err := s.reminderChecker.MarkRemindedByID(r.ID); err != nil {
					log.Printf("Error marking reminder %d as reminded: %v", r.ID, err)
				}
			}
			continue
		}

		// Send each reminder as a separate notification
		for _, r := range reminders {
			title := "🔔 " + r.Title
			body := r.Detail
			if body == "" {
				body = "You have a reminder due."
			}

			if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
				log.Printf("Error sending reminder notification %d for user %d: %v", r.ID, userID, err)
			} else {
				log.Printf("Sent reminder notification %d to user %d", r.ID, userID)
			}

			// Mark as reminded (advances next_remind_at for recurring)
			if err := s.reminderChecker.MarkRemindedByID(r.ID); err != nil {
				log.Printf("Error marking reminder %d as reminded: %v", r.ID, err)
			}
		}
	}
}
