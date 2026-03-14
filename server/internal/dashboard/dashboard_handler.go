package dashboard

import (
	"net/http"
	"strconv"
	"time"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type DashboardHandler struct {
	service *DashboardService
}

func NewDashboardHandler(service *DashboardService) *DashboardHandler {
	return &DashboardHandler{service: service}
}

// GetDashboardStats returns dashboard statistics for the current user
func (h *DashboardHandler) GetDashboardStats(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	stats, err := h.service.GetDashboardStats(userID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load dashboard stats",
		})
	}

	return c.JSON(http.StatusOK, stats)
}

// GetDueWallets returns due wallets for a specific month
func (h *DashboardHandler) GetDueWallets(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	// Get year and month from query params, default to current month
	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	if yearStr := c.QueryParam("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			year = y
		}
	}

	if monthStr := c.QueryParam("month"); monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}

	dueWallets, err := h.service.GetDueWallets(userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load due wallets",
		})
	}

	return c.JSON(http.StatusOK, dueWallets)
}

// GetDueExpenses returns due expenses for a specific month
func (h *DashboardHandler) GetDueExpenses(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	// Get year and month from query params, default to current month
	now := time.Now()
	year := now.Year()
	month := int(now.Month())

	if yearStr := c.QueryParam("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil {
			year = y
		}
	}

	if monthStr := c.QueryParam("month"); monthStr != "" {
		if m, err := strconv.Atoi(monthStr); err == nil && m >= 1 && m <= 12 {
			month = m
		}
	}

	dueExpenses, err := h.service.GetDueExpenses(userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load due expenses",
		})
	}

	return c.JSON(http.StatusOK, dueExpenses)
}
