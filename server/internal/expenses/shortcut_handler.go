package expenses

import (
	"net/http"
	"strings"
	"time"

	"dannyswat/jiceot/internal/auth"

	"github.com/labstack/echo/v4"
)

type ShortcutHandler struct {
	expenseService     *ExpenseService
	expenseTypeService *ExpenseTypeService
	walletService      *WalletService
}

type ShortcutExpenseRequest struct {
	Amount   float64 `json:"amount"`
	WalletID *uint   `json:"wallet_id"`
	Category string  `json:"category"`
	Note     string  `json:"note"`
	Date     string  `json:"date"`
}

func NewShortcutHandler(expenseService *ExpenseService, expenseTypeService *ExpenseTypeService, walletService *WalletService) *ShortcutHandler {
	return &ShortcutHandler{
		expenseService:     expenseService,
		expenseTypeService: expenseTypeService,
		walletService:      walletService,
	}
}

// CreateAutomationExpense handles POST /api/automation/expense.
// Accepts a per-user automation API key in the api_key query parameter.
func (h *ShortcutHandler) CreateAutomationExpense(c echo.Context) error {
	return h.createExpenseFromShortcutRequest(c)
}

func (h *ShortcutHandler) createExpenseFromShortcutRequest(c echo.Context) error {
	userID := auth.GetUserIDFromContext(c)
	if userID == 0 {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Unauthorized"})
	}

	var req ShortcutExpenseRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Invalid request format"})
	}
	req.Category = strings.TrimSpace(req.Category)
	req.Note = strings.TrimSpace(req.Note)

	if req.Amount <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Amount must be greater than 0"})
	}
	if req.Category == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "Category is required"})
	}

	// Default date to today
	date := req.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// Find expense type by iOS category
	expenseType, err := h.expenseTypeService.FindExpenseTypeByIOSCategory(userID, req.Category)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "No expense type found for category: " + req.Category,
		})
	}

	// Use wallet_id from request, or fall back to expense type's default wallet
	walletID := req.WalletID
	if walletID == nil {
		walletID = expenseType.DefaultWalletID
	}

	expense, err := h.expenseService.CreateExpense(userID, CreateExpenseRequest{
		ExpenseTypeID: expenseType.ID,
		WalletID:      walletID,
		Amount:        req.Amount,
		Date:          date,
		Note:          req.Note,
	})
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusCreated, expense)
}
