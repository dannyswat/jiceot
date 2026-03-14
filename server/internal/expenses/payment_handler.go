package expenses

import (
	"net/http"
	"strconv"
	"time"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type PaymentHandler struct {
	service *PaymentService
}

func NewPaymentHandler(service *PaymentService) *PaymentHandler {
	return &PaymentHandler{service: service}
}

func (h *PaymentHandler) CreatePayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	var req CreatePaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	payment, err := h.service.CreatePayment(userID, req)
	if err != nil {
		return h.paymentError(c, err, "Failed to create payment")
	}
	return c.JSON(http.StatusCreated, payment)
}

func (h *PaymentHandler) GetPayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payment ID"})
	}
	payment, err := h.service.GetPayment(userID, uint(paymentID))
	if err != nil {
		return h.paymentError(c, err, "Failed to get payment")
	}
	return c.JSON(http.StatusOK, payment)
}

func (h *PaymentHandler) UpdatePayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payment ID"})
	}
	var req UpdatePaymentRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	payment, err := h.service.UpdatePayment(userID, uint(paymentID), req)
	if err != nil {
		return h.paymentError(c, err, "Failed to update payment")
	}
	return c.JSON(http.StatusOK, payment)
}

func (h *PaymentHandler) DeletePayment(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	paymentID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid payment ID"})
	}
	if err := h.service.DeletePayment(userID, uint(paymentID)); err != nil {
		return h.paymentError(c, err, "Failed to delete payment")
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Payment deleted successfully"})
}

func (h *PaymentHandler) ListPayments(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	var req PaymentListRequest
	req.Limit, _ = strconv.Atoi(c.QueryParam("limit"))
	req.Offset, _ = strconv.Atoi(c.QueryParam("offset"))
	if walletIDStr := c.QueryParam("wallet_id"); walletIDStr != "" {
		if walletID, err := strconv.ParseUint(walletIDStr, 10, 32); err == nil {
			id := uint(walletID)
			req.WalletID = &id
		}
	}
	if fromStr := c.QueryParam("from"); fromStr != "" {
		if from, err := ParseDateOnly(fromStr); err == nil {
			req.From = &from
		}
	}
	if toStr := c.QueryParam("to"); toStr != "" {
		if to, err := ParseDateOnly(toStr); err == nil {
			req.To = &to
		}
	}
	response, err := h.service.ListPayments(userID, req)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list payments"})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *PaymentHandler) GetMonthlyTotal(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	fromStr := c.QueryParam("from")
	toStr := c.QueryParam("to")
	var from, to time.Time
	var err error
	if fromStr != "" && toStr != "" {
		from, err = ParseDateOnly(fromStr)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		to, err = ParseDateOnly(toStr)
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
	} else {
		year, err := strconv.Atoi(c.QueryParam("year"))
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "year is required when from/to are omitted"})
		}
		month, err := strconv.Atoi(c.QueryParam("month"))
		if err != nil || month < 1 || month > 12 {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid month"})
		}
		from = BeginningOfMonth(year, month)
		to = EndOfMonth(year, month)
	}
	total, err := h.service.GetMonthlyTotal(userID, from, to)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to calculate payment total"})
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"from": from.Format(DateOnlyLayout), "to": to.Format(DateOnlyLayout), "total": total})
}

func (h *PaymentHandler) paymentError(c echo.Context, err error, fallback string) error {
	switch err {
	case ErrPaymentNotFound, ErrWalletNotFound, ErrExpenseNotFound:
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	case ErrInvalidPaymentAmount, ErrInvalidPaymentDate:
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		if err != nil {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
		}
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fallback})
	}
}
