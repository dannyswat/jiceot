package expenses

import (
	"net/http"
	"strconv"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type WalletHandler struct {
	service *WalletService
}

func NewWalletHandler(service *WalletService) *WalletHandler {
	return &WalletHandler{service: service}
}

func (h *WalletHandler) CreateWallet(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	var req CreateWalletRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	wallet, err := h.service.CreateWallet(userID, req)
	if err != nil {
		return h.walletError(c, err, "Failed to create wallet")
	}
	return c.JSON(http.StatusCreated, wallet)
}

func (h *WalletHandler) GetWallet(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	wallet, err := h.service.GetWallet(userID, uint(walletID))
	if err != nil {
		return h.walletError(c, err, "Failed to get wallet")
	}
	return c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) UpdateWallet(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	var req UpdateWalletRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	wallet, err := h.service.UpdateWallet(userID, uint(walletID), req)
	if err != nil {
		return h.walletError(c, err, "Failed to update wallet")
	}
	return c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) DeleteWallet(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	if err := h.service.DeleteWallet(userID, uint(walletID)); err != nil {
		return h.walletError(c, err, "Failed to delete wallet")
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Wallet deleted successfully"})
}

func (h *WalletHandler) ListWallets(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	offset, _ := strconv.Atoi(c.QueryParam("offset"))
	includeStopped := c.QueryParam("include_stopped") == "true"
	response, err := h.service.ListWallets(userID, limit, offset, c.QueryParam("type"), includeStopped)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to list wallets"})
	}
	return c.JSON(http.StatusOK, response)
}

func (h *WalletHandler) ToggleWallet(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	wallet, err := h.service.ToggleWallet(userID, uint(walletID))
	if err != nil {
		return h.walletError(c, err, "Failed to toggle wallet")
	}
	return c.JSON(http.StatusOK, wallet)
}

func (h *WalletHandler) GetWalletPayments(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	payments, err := h.service.GetWalletPayments(userID, uint(walletID))
	if err != nil {
		return h.walletError(c, err, "Failed to get wallet payments")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"payments": payments, "total": len(payments)})
}

func (h *WalletHandler) GetUnbilledExpenses(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	walletID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid wallet ID"})
	}
	expenses, err := h.service.GetWalletUnbilledExpenses(userID, uint(walletID))
	if err != nil {
		return h.walletError(c, err, "Failed to get unbilled expenses")
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"expenses": expenses, "total": len(expenses)})
}

func (h *WalletHandler) walletError(c echo.Context, err error, fallback string) error {
	switch err {
	case ErrWalletNotFound:
		return c.JSON(http.StatusNotFound, map[string]string{"error": err.Error()})
	case ErrWalletNameExists:
		return c.JSON(http.StatusConflict, map[string]string{"error": err.Error()})
	case ErrEmptyWalletName, ErrInvalidWalletType, ErrInvalidWalletPeriod, ErrInvalidWalletDueDay, ErrExpenseTypeNotFound:
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fallback})
	}
}
