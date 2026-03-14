package expenses

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type ExpenseTypeHandler struct {
	expenseTypeService *ExpenseTypeService
}

func NewExpenseTypeHandler(expenseTypeService *ExpenseTypeService) *ExpenseTypeHandler {
	return &ExpenseTypeHandler{
		expenseTypeService: expenseTypeService,
	}
}

// CreateExpenseType handles POST /api/expense-types
func (h *ExpenseTypeHandler) CreateExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	var req CreateExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}

	expenseType, err := h.expenseTypeService.CreateExpenseType(userID, req)
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to create expense type")
	}

	return c.JSON(http.StatusCreated, expenseType)
}

// GetExpenseType handles GET /api/expense-types/:id
func (h *ExpenseTypeHandler) GetExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense type ID"})
	}

	expenseType, err := h.expenseTypeService.GetExpenseType(userID, uint(expenseTypeID))
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to get expense type")
	}

	return c.JSON(http.StatusOK, expenseType)
}

// UpdateExpenseType handles PUT /api/expense-types/:id
func (h *ExpenseTypeHandler) UpdateExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense type ID"})
	}

	var req UpdateExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}

	expenseType, err := h.expenseTypeService.UpdateExpenseType(userID, uint(expenseTypeID), req)
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to update expense type")
	}

	return c.JSON(http.StatusOK, expenseType)
}

// DeleteExpenseType handles DELETE /api/expense-types/:id
func (h *ExpenseTypeHandler) DeleteExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense type ID"})
	}

	err = h.expenseTypeService.DeleteExpenseType(userID, uint(expenseTypeID))
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to delete expense type")
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Expense type deleted successfully"})
}

// ListExpenseTypes handles GET /api/expense-types
func (h *ExpenseTypeHandler) ListExpenseTypes(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)

	// Parse query parameters
	var limit, offset int
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Default limit if not specified
	if limit == 0 {
		limit = 100
	}
	includeStopped := c.QueryParam("include_stopped") == "true"

	response, err := h.expenseTypeService.ListExpenseTypes(userID, limit, offset, includeStopped)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list expense types"})
	}

	return c.JSON(http.StatusOK, response)
}

func (h *ExpenseTypeHandler) GetExpenseTypeTree(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	includeStopped := c.QueryParam("include_stopped") == "true"
	tree, err := h.expenseTypeService.GetExpenseTypeTree(userID, includeStopped)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to load expense type tree"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"tree": tree, "total": len(tree)})
}

func (h *ExpenseTypeHandler) PostponeExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	expenseTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense type ID"})
	}
	var req PostponeExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	expenseType, err := h.expenseTypeService.PostponeExpenseType(userID, uint(expenseTypeID), req)
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to postpone expense type")
	}
	return c.JSON(http.StatusOK, expenseType)
}

func (h *ExpenseTypeHandler) ToggleExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	expenseTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid expense type ID"})
	}
	expenseType, err := h.expenseTypeService.ToggleExpenseType(userID, uint(expenseTypeID))
	if err != nil {
		return h.expenseTypeError(c, err, "Failed to toggle expense type")
	}
	return c.JSON(http.StatusOK, expenseType)
}

func (h *ExpenseTypeHandler) expenseTypeError(c echo.Context, err error, fallback string) error {
	switch err {
	case ErrExpenseTypeNotFound, ErrWalletNotFound:
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	case ErrExpenseTypeNameExists:
		return c.JSON(http.StatusConflict, map[string]string{"error": err.Error()})
	case ErrEmptyExpenseTypeName, ErrInvalidExpenseParent, ErrInvalidRecurringType, ErrInvalidRecurringPeriod, ErrInvalidRecurringDueDay, ErrFlexiblePostponeOnly, ErrExpenseTypeCycleReference, ErrExpenseTypeInUse:
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fallback})
	}
}
