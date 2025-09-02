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
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req CreateExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	expenseType, err := h.expenseTypeService.CreateExpenseType(userID, req)
	if err != nil {
		switch err {
		case ErrExpenseTypeNameExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Expense type name already exists",
			})
		case ErrEmptyExpenseTypeName:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to create expense type",
			})
		}
	}

	return c.JSON(http.StatusCreated, expenseType)
}

// GetExpenseType handles GET /api/expense-types/:id
func (h *ExpenseTypeHandler) GetExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense type ID",
		})
	}

	expenseType, err := h.expenseTypeService.GetExpenseType(userID, uint(expenseTypeID))
	if err != nil {
		if err == ErrExpenseTypeNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Expense type not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get expense type",
		})
	}

	return c.JSON(http.StatusOK, expenseType)
}

// UpdateExpenseType handles PUT /api/expense-types/:id
func (h *ExpenseTypeHandler) UpdateExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense type ID",
		})
	}

	var req UpdateExpenseTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	expenseType, err := h.expenseTypeService.UpdateExpenseType(userID, uint(expenseTypeID), req)
	if err != nil {
		switch err {
		case ErrExpenseTypeNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Expense type not found",
			})
		case ErrExpenseTypeNameExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Expense type name already exists",
			})
		case ErrEmptyExpenseTypeName:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to update expense type",
			})
		}
	}

	return c.JSON(http.StatusOK, expenseType)
}

// DeleteExpenseType handles DELETE /api/expense-types/:id
func (h *ExpenseTypeHandler) DeleteExpenseType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	expenseTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid expense type ID",
		})
	}

	err = h.expenseTypeService.DeleteExpenseType(userID, uint(expenseTypeID))
	if err != nil {
		if err == ErrExpenseTypeNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Expense type not found",
			})
		}
		// Check for constraint violation (expense type in use)
		if err.Error() == "cannot delete expense type that is being used by expense items" {
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Cannot delete expense type that is being used by expense items",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete expense type",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Expense type deleted successfully",
	})
}

// ListExpenseTypes handles GET /api/expense-types
func (h *ExpenseTypeHandler) ListExpenseTypes(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

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

	response, err := h.expenseTypeService.ListExpenseTypes(userID, limit, offset)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to list expense types",
		})
	}

	return c.JSON(http.StatusOK, response)
}
