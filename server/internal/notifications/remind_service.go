package notifications

import (
	"context"
	"fmt"
	"log"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type RemindService struct {
	db     *gorm.DB
	cancel context.CancelFunc
}

func NewRemindService(db *gorm.DB) *RemindService {
	return &RemindService{
		db: db,
	}
}

// StartBackgroundReminders starts the background service that runs every hour
func (s *RemindService) StartBackgroundReminders() {
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
	now := time.Now()
	currentHour := now.Hour()

	log.Printf("Checking reminders at %s (hour: %d)", now.Format(time.RFC3339), currentHour)

	var settings []UserNotificationSetting
	if err := s.db.Where("bark_enabled = ? AND remind_hour = ?", true, currentHour).Find(&settings).Error; err != nil {
		log.Printf("Error fetching notification settings: %v", err)
		return
	}

	log.Printf("Found %d users with notifications enabled for hour %d", len(settings), currentHour)

	for _, setting := range settings {
		if err := s.processUserReminders(setting); err != nil {
			log.Printf("Error processing reminders for user %d: %v", setting.UserID, err)
		}
	}
}

// processUserReminders processes reminders for a single user
func (s *RemindService) processUserReminders(setting UserNotificationSetting) error {
	// Calculate the target date range for reminders
	now := time.Now()
	reminderDate := now.AddDate(0, 0, setting.RemindDaysBefore)
	targetMonth := reminderDate.Month()
	targetYear := reminderDate.Year()

	log.Printf("Processing reminders for user %d: checking bills due in %d days (target: %d-%02d)",
		setting.UserID, setting.RemindDaysBefore, targetYear, int(targetMonth))

	// Find all active bill types for this user
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ? AND stopped = ? AND bill_day > 0", setting.UserID, false).Find(&billTypes).Error; err != nil {
		return fmt.Errorf("failed to fetch bill types: %w", err)
	}

	var billsDue []BillDue

	for _, billType := range billTypes {
		// Check if this bill type has a payment for the target month
		var existingPayment expenses.BillPayment
		result := s.db.Where("bill_type_id = ? AND year = ? AND month = ? AND user_id = ?",
			billType.ID, targetYear, int(targetMonth), setting.UserID).First(&existingPayment)

		// If no payment exists, this bill is due
		if result.Error == gorm.ErrRecordNotFound {
			billsDue = append(billsDue, BillDue{
				BillType: billType,
				DueDate:  time.Date(targetYear, targetMonth, billType.BillDay, 0, 0, 0, 0, time.Local),
				Amount:   billType.FixedAmount,
			})
		}
	}

	// Send notification if there are bills due
	if len(billsDue) > 0 {
		return s.sendReminderNotification(setting, billsDue)
	}

	log.Printf("No bills due for user %d", setting.UserID)
	return nil
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
		body = fmt.Sprintf("You have 1 bill due on %s:\n\n• %s",
			bill.DueDate.Format("2 Jan"),
			bill.BillType.Name)
		if bill.Amount != "" && bill.Amount != "0" {
			body += fmt.Sprintf(" - $%s", bill.Amount)
		}
	} else {
		body = fmt.Sprintf("You have %d bills due soon:", len(billsDue))
	}

	log.Printf("Sending notification to user %d: %d bills due", setting.UserID, len(billsDue))

	if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
		return fmt.Errorf("failed to send bark notification: %w", err)
	}

	log.Printf("Successfully sent reminder notification to user %d", setting.UserID)
	return nil
}
