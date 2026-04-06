package notifications

import (
	"gorm.io/gorm"
)

type NotificationSettingService struct {
	db *gorm.DB
}

func NewNotificationSettingService(db *gorm.DB) *NotificationSettingService {
	return &NotificationSettingService{db: db}
}

func (s *NotificationSettingService) GetByUserID(userID uint) (*NotificationSetting, error) {
	var setting NotificationSetting
	err := s.db.Where("user_id = ?", userID).First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		// Return defaults
		return &NotificationSetting{
			UserID:       userID,
			Enabled:      false,
			ReminderTime: "",
			Timezone:     "",
			DueDaysAhead: 3,
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

type UpdateNotificationSettingRequest struct {
	BarkURL      *string `json:"bark_url"`
	Enabled      *bool   `json:"enabled"`
	ReminderTime *string `json:"reminder_time"`
	Timezone     *string `json:"timezone"`
	DueDaysAhead *int    `json:"due_days_ahead"`
}

func (s *NotificationSettingService) Update(userID uint, req UpdateNotificationSettingRequest) (*NotificationSetting, error) {
	var setting NotificationSetting
	err := s.db.Where("user_id = ?", userID).First(&setting).Error
	if err == gorm.ErrRecordNotFound {
		setting = NotificationSetting{
			UserID:       userID,
			Enabled:      false,
			ReminderTime: "09:00",
			Timezone:     "UTC",
			DueDaysAhead: 3,
		}
		if err := s.db.Create(&setting).Error; err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	if req.BarkURL != nil {
		setting.BarkURL = *req.BarkURL
	}
	if req.Enabled != nil {
		setting.Enabled = *req.Enabled
	}
	if req.ReminderTime != nil {
		setting.ReminderTime = *req.ReminderTime
	}
	if req.Timezone != nil {
		setting.Timezone = *req.Timezone
	}
	if req.DueDaysAhead != nil {
		days := *req.DueDaysAhead
		if days < 1 {
			days = 1
		}
		if days > 30 {
			days = 30
		}
		setting.DueDaysAhead = days
	}

	if err := s.db.Save(&setting).Error; err != nil {
		return nil, err
	}
	return &setting, nil
}

func (s *NotificationSettingService) TestBark(userID uint) error {
	setting, err := s.GetByUserID(userID)
	if err != nil {
		return err
	}
	if setting.BarkURL == "" {
		return ErrBarkURLEmpty
	}
	client := NewBarkClient()
	return client.Send(setting.BarkURL, "Jiceot Test", "Bark notifications are working!")
}
