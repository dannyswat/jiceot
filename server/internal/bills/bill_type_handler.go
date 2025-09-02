package bills

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type BillTypeHandler struct {
	billTypeService *BillTypeService
}

func NewBillTypeHandler(billTypeService *BillTypeService) *BillTypeHandler {
	return &BillTypeHandler{
		billTypeService: billTypeService,
	}
}

// CreateBillType handles POST /api/bill-types
func (h *BillTypeHandler) CreateBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req CreateBillTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	billType, err := h.billTypeService.CreateBillType(userID, req)
	if err != nil {
		switch err {
		case ErrBillTypeNameExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Bill type name already exists",
			})
		case ErrEmptyBillTypeName, ErrInvalidBillDay, ErrInvalidBillCycle:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to create bill type",
			})
		}
	}

	return c.JSON(http.StatusCreated, billType)
}

// GetBillType handles GET /api/bill-types/:id
func (h *BillTypeHandler) GetBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	billTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill type ID",
		})
	}

	billType, err := h.billTypeService.GetBillType(userID, uint(billTypeID))
	if err != nil {
		if err == ErrBillTypeNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill type not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get bill type",
		})
	}

	return c.JSON(http.StatusOK, billType)
}

// UpdateBillType handles PUT /api/bill-types/:id
func (h *BillTypeHandler) UpdateBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	billTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill type ID",
		})
	}

	var req UpdateBillTypeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	billType, err := h.billTypeService.UpdateBillType(userID, uint(billTypeID), req)
	if err != nil {
		switch err {
		case ErrBillTypeNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill type not found",
			})
		case ErrBillTypeNameExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Bill type name already exists",
			})
		case ErrEmptyBillTypeName, ErrInvalidBillDay, ErrInvalidBillCycle:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to update bill type",
			})
		}
	}

	return c.JSON(http.StatusOK, billType)
}

// DeleteBillType handles DELETE /api/bill-types/:id
func (h *BillTypeHandler) DeleteBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	billTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill type ID",
		})
	}

	err = h.billTypeService.DeleteBillType(userID, uint(billTypeID))
	if err != nil {
		if err == ErrBillTypeNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill type not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete bill type",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Bill type deleted successfully",
	})
}

// ListBillTypes handles GET /api/bill-types
func (h *BillTypeHandler) ListBillTypes(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	// Parse query parameters
	limit := 10
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

	includesStopped := c.QueryParam("include_stopped") == "true"

	response, err := h.billTypeService.ListBillTypes(userID, limit, offset, includesStopped)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to list bill types",
		})
	}

	return c.JSON(http.StatusOK, response)
}

// ToggleBillType handles POST /api/bill-types/:id/toggle
func (h *BillTypeHandler) ToggleBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	billTypeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill type ID",
		})
	}

	billType, err := h.billTypeService.ToggleBillType(userID, uint(billTypeID))
	if err != nil {
		if err == ErrBillTypeNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill type not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to toggle bill type",
		})
	}

	return c.JSON(http.StatusOK, billType)
}
