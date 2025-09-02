package expenses

import (
	"dannyswat/jiceot/internal/auth"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

type ExpenseItemHandler struct {
	service *ExpenseItemService
}

func NewExpenseItemHandler(service *ExpenseItemService) *ExpenseItemHandler {
	return &ExpenseItemHandler{service: service}
}

func (h *ExpenseItemHandler) CreateExpenseItem(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req CreateExpenseItemRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	expenseItem, err := h.service.CreateExpenseItem(req, userID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusCreated, expenseItem)
}

func (h *ExpenseItemHandler) GetExpenseItem(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense item ID",
		})
	}

	expenseItem, err := h.service.GetExpenseItem(uint(id), userID)
	if err != nil {
		if err.Error() == "expense item not found" {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, expenseItem)
}

func (h *ExpenseItemHandler) UpdateExpenseItem(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense item ID",
		})
	}

	var req UpdateExpenseItemRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request body",
		})
	}

	expenseItem, err := h.service.UpdateExpenseItem(uint(id), req, userID)
	if err != nil {
		if err.Error() == "expense item not found" {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
		}
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, expenseItem)
}

func (h *ExpenseItemHandler) DeleteExpenseItem(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense item ID",
		})
	}

	err = h.service.DeleteExpenseItem(uint(id), userID)
	if err != nil {
		if err.Error() == "expense item not found" {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": err.Error(),
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.NoContent(http.StatusNoContent)
}

func (h *ExpenseItemHandler) ListExpenseItems(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	// Parse filters
	var expenseTypeID *uint
	if etID := c.QueryParam("expense_type_id"); etID != "" {
		if id, err := strconv.ParseUint(etID, 10, 32); err == nil {
			uid := uint(id)
			expenseTypeID = &uid
		}
	}

	var billPaymentID *uint
	if bpID := c.QueryParam("bill_payment_id"); bpID != "" {
		if id, err := strconv.ParseUint(bpID, 10, 32); err == nil {
			uid := uint(id)
			billPaymentID = &uid
		}
	}

	var year *int
	if y := c.QueryParam("year"); y != "" {
		if yr, err := strconv.Atoi(y); err == nil {
			year = &yr
		}
	}

	var month *int
	if m := c.QueryParam("month"); m != "" {
		if mn, err := strconv.Atoi(m); err == nil {
			month = &mn
		}
	}

	// Parse pagination
	limit := 20 // default
	if l := c.QueryParam("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	offset := 0 // default
	if o := c.QueryParam("offset"); o != "" {
		if parsedOffset, err := strconv.Atoi(o); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	response, err := h.service.ListExpenseItems(userID, expenseTypeID, billPaymentID, year, month, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ExpenseItemHandler) GetExpenseItemsByMonth(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	year, err := strconv.Atoi(c.Param("year"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid year",
		})
	}

	month, err := strconv.Atoi(c.Param("month"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid month",
		})
	}

	if month < 1 || month > 12 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Month must be between 1 and 12",
		})
	}

	expenseItems, total, err := h.service.GetExpenseItemsByMonth(userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	response := map[string]interface{}{
		"expense_items": expenseItems,
		"total_amount":  total.String(),
		"year":          year,
		"month":         month,
	}

	return c.JSON(http.StatusOK, response)
}
