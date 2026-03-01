package reminders

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type ReminderHandler struct {
	service *ReminderService
}

func NewReminderHandler(service *ReminderService) *ReminderHandler {
	return &ReminderHandler{service: service}
}

// CreateReminder handles POST /api/reminders
func (h *ReminderHandler) CreateReminder(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	var req CreateReminderRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}

	reminder, err := h.service.CreateReminder(userID, req)
	if err != nil {
		switch err {
		case ErrEmptyReminderTitle, ErrInvalidRemindAt, ErrInvalidRecurrence,
			ErrInvalidRemindHour, ErrInvalidDaysOfWeek, ErrInvalidDayOfMonth, ErrInvalidMonthOfYear, ErrInvalidTimezone:
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to create reminder"})
		}
	}

	return c.JSON(http.StatusCreated, reminder)
}

// GetReminder handles GET /api/reminders/:id
func (h *ReminderHandler) GetReminder(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid reminder ID"})
	}

	reminder, err := h.service.GetReminder(userID, uint(reminderID))
	if err != nil {
		if err == ErrReminderNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Reminder not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to get reminder"})
	}

	return c.JSON(http.StatusOK, reminder)
}

// UpdateReminder handles PUT /api/reminders/:id
func (h *ReminderHandler) UpdateReminder(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid reminder ID"})
	}

	var req UpdateReminderRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}

	reminder, err := h.service.UpdateReminder(userID, uint(reminderID), req)
	if err != nil {
		switch err {
		case ErrReminderNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Reminder not found"})
		case ErrEmptyReminderTitle, ErrInvalidRemindAt, ErrInvalidRecurrence,
			ErrInvalidRemindHour, ErrInvalidDaysOfWeek, ErrInvalidDayOfMonth, ErrInvalidMonthOfYear, ErrInvalidTimezone:
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to update reminder"})
		}
	}

	return c.JSON(http.StatusOK, reminder)
}

// DeleteReminder handles DELETE /api/reminders/:id
func (h *ReminderHandler) DeleteReminder(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid reminder ID"})
	}

	err = h.service.DeleteReminder(userID, uint(reminderID))
	if err != nil {
		if err == ErrReminderNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Reminder not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to delete reminder"})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Reminder deleted successfully"})
}

// ListReminders handles GET /api/reminders
func (h *ReminderHandler) ListReminders(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	limit := 50
	if l := c.QueryParam("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil {
			limit = parsedLimit
		}
	}

	offset := 0
	if o := c.QueryParam("offset"); o != "" {
		if parsedOffset, err := strconv.Atoi(o); err == nil {
			offset = parsedOffset
		}
	}

	showAll := c.QueryParam("show_all") == "true"

	response, err := h.service.ListReminders(userID, limit, offset, showAll)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list reminders"})
	}

	return c.JSON(http.StatusOK, response)
}

// ToggleReminder handles POST /api/reminders/:id/toggle
func (h *ReminderHandler) ToggleReminder(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	reminderID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid reminder ID"})
	}

	reminder, err := h.service.ToggleReminder(userID, uint(reminderID))
	if err != nil {
		if err == ErrReminderNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{"error": "Reminder not found"})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to toggle reminder"})
	}

	return c.JSON(http.StatusOK, reminder)
}
