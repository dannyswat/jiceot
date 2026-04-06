package notifications

import (
	"net/http"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type NotificationSettingHandler struct {
	service *NotificationSettingService
}

func NewNotificationSettingHandler(service *NotificationSettingService) *NotificationSettingHandler {
	return &NotificationSettingHandler{service: service}
}

// GetSettings handles GET /api/notification-settings
func (h *NotificationSettingHandler) GetSettings(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	setting, err := h.service.GetByUserID(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load notification settings",
		})
	}

	return c.JSON(http.StatusOK, setting)
}

// UpdateSettings handles PUT /api/notification-settings
func (h *NotificationSettingHandler) UpdateSettings(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	var req UpdateNotificationSettingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	setting, err := h.service.Update(userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to update notification settings",
		})
	}

	return c.JSON(http.StatusOK, setting)
}

// TestBark handles POST /api/notification-settings/test
func (h *NotificationSettingHandler) TestBark(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	err := h.service.TestBark(userID)
	if err != nil {
		if err == ErrBarkURLEmpty {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "Bark URL is not configured",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to send test notification: " + err.Error(),
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Test notification sent successfully",
	})
}
