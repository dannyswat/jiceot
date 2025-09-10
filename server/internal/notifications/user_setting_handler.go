package notifications

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type UserSettingHandler struct {
	service *UserSettingService
}

func NewUserSettingHandler(service *UserSettingService) *UserSettingHandler {
	return &UserSettingHandler{
		service: service,
	}
}

// GetUserSetting gets the notification setting for the current user
func (h *UserSettingHandler) GetUserSetting(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	setting, err := h.service.GetUserSetting(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get notification setting",
		})
	}

	return c.JSON(http.StatusOK, setting)
}

// CreateOrUpdateUserSetting creates or updates notification setting for the current user
func (h *UserSettingHandler) CreateOrUpdateUserSetting(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	var req struct {
		BarkApiUrl       string `json:"bark_api_url"`
		BarkEnabled      bool   `json:"bark_enabled"`
		RemindHour       int    `json:"remind_hour"`
		RemindDaysBefore int    `json:"remind_days_before"`
	}

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	// Validate remind_hour (0-23)
	if req.RemindHour < 0 || req.RemindHour > 23 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "remind_hour must be between 0 and 23",
		})
	}

	// Validate remind_days_before (0-30)
	if req.RemindDaysBefore < 0 || req.RemindDaysBefore > 30 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "remind_days_before must be between 0 and 30",
		})
	}

	setting := &UserNotificationSetting{
		UserID:           userID,
		BarkApiUrl:       req.BarkApiUrl,
		BarkEnabled:      req.BarkEnabled,
		RemindHour:       req.RemindHour,
		RemindDaysBefore: req.RemindDaysBefore,
	}

	if err := h.service.CreateOrUpdateUserSetting(setting); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to save notification setting",
		})
	}

	return c.JSON(http.StatusOK, setting)
}

// TestNotification sends a test notification to verify the Bark configuration
func (h *UserSettingHandler) TestNotification(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	setting, err := h.service.GetUserSetting(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get notification setting",
		})
	}

	if !setting.BarkEnabled || setting.BarkApiUrl == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Bark notifications are not enabled or API URL is not configured",
		})
	}

	title := "🧪 Test Notification"
	body := "This is a test notification from Jiceot. Your Bark configuration is working correctly!"

	if err := SendNotificationViaBark(setting.BarkApiUrl, title, body); err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to send test notification: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Test notification sent successfully",
	})
}

// TriggerManualReminder manually triggers the reminder check for the current user
func (h *UserSettingHandler) TriggerManualReminder(c echo.Context) error {
	userID := c.Get("user_id").(uint)

	// Get days parameter from query (optional, defaults to user's setting)
	daysStr := c.QueryParam("days")
	var days *int
	if daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d >= 0 && d <= 365 {
			days = &d
		} else {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "days parameter must be between 0 and 365",
			})
		}
	}

	result, err := h.service.TriggerManualReminder(userID, days)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to trigger manual reminder: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, result)
}
