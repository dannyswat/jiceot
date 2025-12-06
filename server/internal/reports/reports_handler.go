package reports

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type ReportsHandler struct {
	service *ReportsService
}

func NewReportsHandler(service *ReportsService) *ReportsHandler {
	return &ReportsHandler{service: service}
}

func (h *ReportsHandler) GetMonthlyReport(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	yearStr := c.QueryParam("year")
	monthStr := c.QueryParam("month")

	if yearStr == "" || monthStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "year and month are required",
		})
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid year",
		})
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil || month < 1 || month > 12 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid month",
		})
	}

	report, err := h.service.GetMonthlyReport(userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load monthly report",
		})
	}

	return c.JSON(http.StatusOK, report)
}

func (h *ReportsHandler) GetYearlyReport(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	yearStr := c.QueryParam("year")
	if yearStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "year is required",
		})
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "invalid year",
		})
	}

	report, err := h.service.GetYearlyReport(userID, year)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to load yearly report",
		})
	}

	return c.JSON(http.StatusOK, report)
}
