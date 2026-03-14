package expenses

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type ExpenseHandler struct {
	service *ExpenseService
}

func NewExpenseHandler(service *ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{service: service}
}

func (h *ExpenseHandler) CreateExpense(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	var req CreateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	expense, err := h.service.CreateExpense(userID, req)
	if err != nil {
		return h.expenseError(c, err, "Failed to create expense")
	}
	return c.JSON(http.StatusCreated, expense)
}

func (h *ExpenseHandler) GetExpense(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense ID"})
	}
	expense, err := h.service.GetExpense(userID, uint(expenseID))
	if err != nil {
		return h.expenseError(c, err, "Failed to get expense")
	}
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpenseHandler) UpdateExpense(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense ID"})
	}
	var req UpdateExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	expense, err := h.service.UpdateExpense(userID, uint(expenseID), req)
	if err != nil {
		return h.expenseError(c, err, "Failed to update expense")
	}
	return c.JSON(http.StatusOK, expense)
}

func (h *ExpenseHandler) DeleteExpense(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense ID"})
	}
	if err := h.service.DeleteExpense(userID, uint(expenseID)); err != nil {
		return h.expenseError(c, err, "Failed to delete expense")
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Expense deleted successfully"})
}

func (h *ExpenseHandler) ListExpenses(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	var req ExpenseListRequest
	req.Limit, _ = strconv.Atoi(c.QueryParam("limit"))
	req.Offset, _ = strconv.Atoi(c.QueryParam("offset"))
	req.UnbilledOnly = c.QueryParam("unbilled_only") == "true"
	if value := c.QueryParam("expense_type_id"); value != "" {
		if parsed, err := strconv.ParseUint(value, 10, 32); err == nil {
			id := uint(parsed)
			req.ExpenseTypeID = &id
		}
	}
	if value := c.QueryParam("wallet_id"); value != "" {
		if parsed, err := strconv.ParseUint(value, 10, 32); err == nil {
			id := uint(parsed)
			req.WalletID = &id
		}
	}
	if value := c.QueryParam("payment_id"); value != "" {
		if parsed, err := strconv.ParseUint(value, 10, 32); err == nil {
			id := uint(parsed)
			req.PaymentID = &id
		}
	}
	if value := c.QueryParam("from"); value != "" {
		if parsed, err := ParseDateOnly(value); err == nil {
			req.From = &parsed
		}
	}
	if value := c.QueryParam("to"); value != "" {
		if parsed, err := ParseDateOnly(value); err == nil {
			req.To = &parsed
		}
	}
	response, err := h.service.ListExpenses(userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list expenses"})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *ExpenseHandler) GetExpensesByDate(c echo.Context) error {
	return h.ListExpenses(c)
}

func (h *ExpenseHandler) expenseError(c echo.Context, err error, fallback string) error {
	switch err {
	case ErrExpenseRecordNotFound, ErrExpenseTypeNotFound, ErrWalletNotFound, ErrPaymentNotFound:
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	case ErrInvalidExpenseAmount, ErrInvalidExpenseDate:
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fallback})
	}
}
