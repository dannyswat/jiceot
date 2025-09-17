package expenses

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type BillPaymentHandler struct {
	billPaymentService *BillPaymentService
	expenseItemService *ExpenseItemService
}

func NewBillPaymentHandler(billPaymentService *BillPaymentService, expenseItemService *ExpenseItemService) *BillPaymentHandler {
	return &BillPaymentHandler{
		billPaymentService: billPaymentService,
		expenseItemService: expenseItemService,
	}
}

// CreateBillPayment handles POST /api/bill-payments
func (h *BillPaymentHandler) CreateBillPayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req CreateBillPaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	billPayment, err := h.billPaymentService.CreateBillPayment(userID, req)
	if err != nil {
		switch err {
		case ErrBillTypeNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill type not found",
			})
		case ErrBillPaymentExists:
			return c.JSON(http.StatusConflict, map[string]string{
				"error": "Bill payment already exists for this month",
			})
		case ErrInvalidBillPaymentAmount, ErrInvalidBillPaymentMonth, ErrInvalidBillPaymentYear:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to create bill payment",
			})
		}
	}

	return c.JSON(http.StatusCreated, billPayment)
}

// GetBillPayment handles GET /api/bill-payments/:id
func (h *BillPaymentHandler) GetBillPayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	billPaymentID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill payment ID",
		})
	}

	billPayment, err := h.billPaymentService.GetBillPayment(userID, uint(billPaymentID))
	if err != nil {
		if err == ErrBillPaymentNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill payment not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get bill payment",
		})
	}

	return c.JSON(http.StatusOK, billPayment)
}

// UpdateBillPayment handles PUT /api/bill-payments/:id
func (h *BillPaymentHandler) UpdateBillPayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	billPaymentID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill payment ID",
		})
	}

	var req UpdateBillPaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid request format",
		})
	}

	billPayment, err := h.billPaymentService.UpdateBillPayment(userID, uint(billPaymentID), req)
	if err != nil {
		switch err {
		case ErrBillPaymentNotFound:
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill payment not found",
			})
		case ErrInvalidBillPaymentAmount:
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": err.Error(),
			})
		default:
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "Failed to update bill payment",
			})
		}
	}

	return c.JSON(http.StatusOK, billPayment)
}

// DeleteBillPayment handles DELETE /api/bill-payments/:id
func (h *BillPaymentHandler) DeleteBillPayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	billPaymentID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill payment ID",
		})
	}

	err = h.billPaymentService.DeleteBillPayment(userID, uint(billPaymentID))
	if err != nil {
		if err == ErrBillPaymentNotFound {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "Bill payment not found",
			})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to delete bill payment",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Bill payment deleted successfully",
	})
}

// ListBillPayments handles GET /api/bill-payments
func (h *BillPaymentHandler) ListBillPayments(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	var req BillPaymentListRequest

	// Parse query parameters
	if limitStr := c.QueryParam("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			req.Limit = limit
		}
	}

	if offsetStr := c.QueryParam("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			req.Offset = offset
		}
	}

	if billTypeIDStr := c.QueryParam("bill_type_id"); billTypeIDStr != "" {
		if billTypeID, err := strconv.ParseUint(billTypeIDStr, 10, 32); err == nil {
			id := uint(billTypeID)
			req.BillTypeID = &id
		}
	}

	if yearStr := c.QueryParam("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			req.Year = &year
		}
	}

	if monthStr := c.QueryParam("month"); monthStr != "" {
		if month, err := strconv.Atoi(monthStr); err == nil {
			req.Month = &month
		}
	}

	// Default limit if not specified
	if req.Limit == 0 {
		req.Limit = 50
	}

	response, err := h.billPaymentService.ListBillPayments(userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to list bill payments",
		})
	}

	return c.JSON(http.StatusOK, response)
}

// GetBillPaymentsByBillType handles GET /api/bill-types/:id/payments
func (h *BillPaymentHandler) GetBillPaymentsByBillType(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	idParam := c.Param("id")
	billTypeID, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid bill type ID",
		})
	}

	billPayments, err := h.billPaymentService.GetBillPaymentsByBillType(userID, uint(billTypeID))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to get bill payments",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"bill_payments": billPayments,
		"total":         len(billPayments),
	})
}

// GetMonthlyTotal handles GET /api/bill-payments/monthly-total
func (h *BillPaymentHandler) GetMonthlyTotal(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	yearStr := c.QueryParam("year")
	monthStr := c.QueryParam("month")

	if yearStr == "" || monthStr == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Year and month parameters are required",
		})
	}

	year, err := strconv.Atoi(yearStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid year parameter",
		})
	}

	month, err := strconv.Atoi(monthStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "Invalid month parameter",
		})
	}

	total, err := h.billPaymentService.GetMonthlyTotal(userID, year, month)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "Failed to calculate monthly total",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"year":  year,
		"month": month,
		"total": total.String(),
	})
}
