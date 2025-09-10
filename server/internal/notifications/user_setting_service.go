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

	// Calculate the target date range for reminders
	now := time.Now()
	reminderDate := now.AddDate(0, 0, daysBefore)
	targetMonth := reminderDate.Month()
	targetYear := reminderDate.Year()

	log.Printf("Manual reminder for user %d: checking bills due in %d days (target: %d-%02d)",
		userID, daysBefore, targetYear, int(targetMonth))

	// Find all active bill types for this user
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ? AND stopped = ? AND bill_day > 0", userID, false).Find(&billTypes).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch bill types: %w", err)
	}

	var billsDue []BillDue

	for _, billType := range billTypes {
		// Check if this bill type has a payment for the target month
		var existingPayment expenses.BillPayment
		result := s.db.Where("bill_type_id = ? AND year = ? AND month = ? AND user_id = ?",
			billType.ID, targetYear, int(targetMonth), userID).First(&existingPayment)

		// If no payment exists, this bill is due
		if result.Error == gorm.ErrRecordNotFound {
			billsDue = append(billsDue, BillDue{
				BillType: billType,
				DueDate:  time.Date(targetYear, targetMonth, billType.BillDay, 0, 0, 0, 0, time.Local),
				Amount:   billType.FixedAmount,
			})
		}
	}

	response := map[string]interface{}{
		"bills_due_count": len(billsDue),
		"days_before":     daysBefore,
		"target_date":     fmt.Sprintf("%d-%02d", targetYear, int(targetMonth)),
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
		body = fmt.Sprintf("You have 1 bill due on %s:\n\n• %s",
			bill.DueDate.Format("Jan 2, 2006"),
			bill.BillType.Name)
		if bill.Amount != "" && bill.Amount != "0" {
			body += fmt.Sprintf(" - $%s", bill.Amount)
		}
	} else {
		body = fmt.Sprintf("You have %d bills due in %d days:\n\n", len(billsDue), daysBefore)
		for i, bill := range billsDue {
			body += fmt.Sprintf("• %s - %s",
				bill.BillType.Name,
				bill.DueDate.Format("Jan 2"))
			if bill.Amount != "" && bill.Amount != "0" {
				body += fmt.Sprintf(" ($%s)", bill.Amount)
			}
			if i < len(billsDue)-1 {
				body += "\n"
			}
		}
	}

	log.Printf("Sending manual notification to user %d: %d bills due", setting.UserID, len(billsDue))

	if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
		return fmt.Errorf("failed to send bark notification: %w", err)
	}

	log.Printf("Successfully sent manual reminder notification to user %d", setting.UserID)
	return nil
}
