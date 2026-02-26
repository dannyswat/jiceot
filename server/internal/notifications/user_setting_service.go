package notifications

import (
	"fmt"
	"log"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type UserSettingService struct {
	db *gorm.DB
}

func NewUserSettingService(db *gorm.DB) *UserSettingService {
	return &UserSettingService{
		db: db,
	}
}

// GetUserSetting gets the notification setting for a user, creating a default one if it doesn't exist
func (s *UserSettingService) GetUserSetting(userID uint) (*UserNotificationSetting, error) {
	var setting UserNotificationSetting
	err := s.db.Where("user_id = ?", userID).First(&setting).Error

	if err == gorm.ErrRecordNotFound {
		// Create default setting
		setting = UserNotificationSetting{
			UserID:           userID,
			BarkApiUrl:       "",
			BarkEnabled:      false,
			RemindHour:       9, // Default to 9 AM
			RemindDaysBefore: 3, // Default to 3 days before
		}

		if err := s.db.Create(&setting).Error; err != nil {
			return nil, fmt.Errorf("failed to create default setting: %w", err)
		}

		return &setting, nil
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get user setting: %w", err)
	}

	return &setting, nil
}

// CreateOrUpdateUserSetting creates or updates a user's notification setting
func (s *UserSettingService) CreateOrUpdateUserSetting(setting *UserNotificationSetting) error {
	var existing UserNotificationSetting
	err := s.db.Where("user_id = ?", setting.UserID).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// Create new setting
		if err := s.db.Create(setting).Error; err != nil {
			return fmt.Errorf("failed to create user setting: %w", err)
		}
		return nil
	}

	if err != nil {
		return fmt.Errorf("failed to check existing setting: %w", err)
	}

	// Update existing setting
	existing.BarkApiUrl = setting.BarkApiUrl
	existing.BarkEnabled = setting.BarkEnabled
	existing.RemindHour = setting.RemindHour
	existing.RemindDaysBefore = setting.RemindDaysBefore

	if err := s.db.Save(&existing).Error; err != nil {
		return fmt.Errorf("failed to update user setting: %w", err)
	}

	// Copy back the updated values
	*setting = existing
	return nil
}

// TriggerManualReminder manually triggers a reminder check for a user
func (s *UserSettingService) TriggerManualReminder(userID uint, customDays *int) (map[string]interface{}, error) {
	setting, err := s.GetUserSetting(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user setting: %w", err)
	}

	if !setting.BarkEnabled || setting.BarkApiUrl == "" {
		return map[string]interface{}{
			"message": "Bark notifications are not enabled or API URL is not configured",
			"sent":    false,
		}, nil
	}

	// Use custom days if provided, otherwise use user's setting
	daysBefore := setting.RemindDaysBefore
	if customDays != nil {
		daysBefore = *customDays
	}

	now := time.Now()

	log.Printf("Manual reminder for user %d: checking bills due in %d days", userID, daysBefore)

	// Find all active bill types for this user (including those with bill_day = 0)
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ? AND stopped = ? AND bill_cycle > 0", userID, false).Find(&billTypes).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch bill types: %w", err)
	}

	var billsDue []BillDue

	for _, billType := range billTypes {
		// Skip if bill cycle is 0 (on-demand bills)
		if billType.BillCycle == 0 {
			continue
		}

		// Get the most recent payment for this bill type
		var lastPayment expenses.BillPayment
		result := s.db.Where("bill_type_id = ? AND user_id = ?", billType.ID, userID).
			Order("year DESC, month DESC").First(&lastPayment)

		// Calculate next due date based on bill cycle
		var nextDueDate time.Time
		if result.Error == gorm.ErrRecordNotFound {
			// No payment exists, bill is due in current month/cycle
			if billType.BillDay > 0 {
				nextDueDate = dateWithClampedDay(now.Year(), now.Month(), billType.BillDay, time.Local)
				// If the bill day has already passed this month, move to next cycle
				if nextDueDate.AddDate(0, 0, 1).Before(now) {
					nextDueDate = s.calculateNextDueDateFromDate(nextDueDate, billType.BillCycle)
				}
			} else {
				// No specific day, use end of current month
				nextDueDate = time.Date(now.Year(), now.Month()+1, 0, 23, 59, 59, 0, time.Local)
			}
		} else if result.Error != nil {
			log.Printf("Error fetching last payment for bill type %d: %v", billType.ID, result.Error)
			continue
		} else {
			// Calculate next due date based on last payment + bill cycle
			nextDueDate = s.calculateNextDueDateFromPayment(lastPayment, billType)
		}

		// Check if the bill is due within the reminder window
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)
		if daysUntilDue <= daysBefore && daysUntilDue >= 0 {
			// Check if there's already a payment for the next due period
			targetYear := nextDueDate.Year()
			targetMonth := int(nextDueDate.Month())

			var existingPayment expenses.BillPayment
			paymentResult := s.db.Where("bill_type_id = ? AND year = ? AND month = ? AND user_id = ?",
				billType.ID, targetYear, targetMonth, userID).First(&existingPayment)

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

	response := map[string]interface{}{
		"bills_due_count": len(billsDue),
		"days_before":     daysBefore,
		"sent":            false,
	}

	// Send notification if there are bills due
	if len(billsDue) > 0 {
		if err := s.sendManualReminderNotification(*setting, billsDue, daysBefore); err != nil {
			return nil, fmt.Errorf("failed to send reminder notification: %w", err)
		}
		response["sent"] = true
		response["message"] = fmt.Sprintf("Sent reminder for %d bills due", len(billsDue))
	} else {
		response["message"] = "No bills due in the specified time period"
	}

	return response, nil
}

// sendManualReminderNotification sends a manual reminder notification via Bark
func (s *UserSettingService) sendManualReminderNotification(setting UserNotificationSetting, billsDue []BillDue, daysBefore int) error {
	title := "📋 Manual Bill Reminder"

	var body string
	if len(billsDue) == 1 {
		bill := billsDue[0]
		body = fmt.Sprintf("You have 1 %s bill due on %s",
			bill.BillType.Name,
			bill.DueDate.Format("2 Jan"))
		if bill.Amount != "" && bill.Amount != "0" {
			body += fmt.Sprintf(" - $%s", bill.Amount)
		}
	} else {
		body = fmt.Sprintf("You have %d bills due within %d days:\n\n", len(billsDue), daysBefore)
	}

	log.Printf("Sending manual notification to user %d: %d bills due", setting.UserID, len(billsDue))

	if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
		return fmt.Errorf("failed to send bark notification: %w", err)
	}

	log.Printf("Successfully sent manual reminder notification to user %d", setting.UserID)
	return nil
}

// calculateNextDueDateFromPayment calculates the next due date based on the last payment and bill cycle
func (s *UserSettingService) calculateNextDueDateFromPayment(lastPayment expenses.BillPayment, billType expenses.BillType) time.Time {
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
		lastDayOfMonth := time.Date(nextYear, time.Month(nextMonth+1), 0, 0, 0, 0, 0, time.Local).Day()
		billDay := billType.BillDay
		if billDay > lastDayOfMonth {
			billDay = lastDayOfMonth
		}
		return time.Date(nextYear, time.Month(nextMonth), billDay, 0, 0, 0, 0, time.Local)
	} else {
		// No specific day, use end of month
		return time.Date(nextYear, time.Month(nextMonth+1), 0, 23, 59, 59, 0, time.Local)
	}
}

// calculateNextDueDateFromDate adds the bill cycle (in months) to the given date
func (s *UserSettingService) calculateNextDueDateFromDate(date time.Time, billCycle int) time.Time {
	nextYear := date.Year()
	nextMonth := int(date.Month()) + billCycle

	// Handle year overflow
	for nextMonth > 12 {
		nextYear++
		nextMonth -= 12
	}

	return time.Date(nextYear, time.Month(nextMonth), date.Day(), date.Hour(), date.Minute(), date.Second(), date.Nanosecond(), date.Location())
}
