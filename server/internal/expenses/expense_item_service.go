package expenses

import (
	"dannyswat/jiceot/internal/bills"
	"errors"
	"fmt"
	"math/big"

	"gorm.io/gorm"
)

type ExpenseItemService struct {
	db *gorm.DB
}

func NewExpenseItemService(db *gorm.DB) *ExpenseItemService {
	return &ExpenseItemService{db: db}
}

type CreateExpenseItemRequest struct {
	BillPaymentID *uint  `json:"bill_payment_id,omitempty"`
	ExpenseTypeID uint   `json:"expense_type_id"`
	Year          int    `json:"year"`
	Month         int    `json:"month"`
	Amount        string `json:"amount"`
	Note          string `json:"note"`
}

type UpdateExpenseItemRequest struct {
	BillPaymentID *uint  `json:"bill_payment_id,omitempty"`
	ExpenseTypeID uint   `json:"expense_type_id"`
	Year          int    `json:"year"`
	Month         int    `json:"month"`
	Amount        string `json:"amount"`
	Note          string `json:"note"`
}

type ExpenseItemListResponse struct {
	ExpenseItems []ExpenseItem `json:"expense_items"`
	Total        int64         `json:"total"`
}

func (s *ExpenseItemService) CreateExpenseItem(req CreateExpenseItemRequest, userID uint) (*ExpenseItem, error) {
	// Validate required fields
	if req.ExpenseTypeID == 0 {
		return nil, errors.New("expense type ID is required")
	}
	if req.Year == 0 {
		return nil, errors.New("year is required")
	}
	if req.Month < 1 || req.Month > 12 {
		return nil, errors.New("month must be between 1 and 12")
	}
	if req.Amount == "" {
		return nil, errors.New("amount is required")
	}

	// Validate amount format
	amount, success := new(big.Float).SetString(req.Amount)
	if !success {
		return nil, errors.New("invalid amount format")
	}
	if amount.Cmp(big.NewFloat(0)) <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	// Validate year constraints (reasonable range)
	currentYear := 2025 // Could be dynamic based on current year
	if req.Year < 2000 || req.Year > currentYear+5 {
		return nil, fmt.Errorf("year must be between 2000 and %d", currentYear+5)
	}

	// Verify expense type exists and belongs to user
	var expenseType ExpenseType
	if err := s.db.Where("id = ? AND user_id = ?", req.ExpenseTypeID, userID).First(&expenseType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expense type not found")
		}
		return nil, fmt.Errorf("failed to verify expense type: %w", err)
	}

	// If bill payment ID is provided, verify it exists and belongs to user
	if req.BillPaymentID != nil {
		var billPayment bills.BillPayment
		if err := s.db.Where("id = ? AND user_id = ?", *req.BillPaymentID, userID).First(&billPayment).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("bill payment not found")
			}
			return nil, fmt.Errorf("failed to verify bill payment: %w", err)
		}
	}

	expenseItem := &ExpenseItem{
		BillPaymentID: req.BillPaymentID,
		ExpenseTypeID: req.ExpenseTypeID,
		Year:          req.Year,
		Month:         req.Month,
		Amount:        req.Amount,
		Note:          req.Note,
		UserID:        userID,
	}

	if err := s.db.Create(expenseItem).Error; err != nil {
		return nil, fmt.Errorf("failed to create expense item: %w", err)
	}

	// Load associations
	if err := s.db.Preload("ExpenseType").Preload("BillPayment").First(expenseItem, expenseItem.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load expense item with associations: %w", err)
	}

	return expenseItem, nil
}

func (s *ExpenseItemService) GetExpenseItem(id uint, userID uint) (*ExpenseItem, error) {
	var expenseItem ExpenseItem
	if err := s.db.Preload("ExpenseType").Preload("BillPayment").Where("id = ? AND user_id = ?", id, userID).First(&expenseItem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expense item not found")
		}
		return nil, fmt.Errorf("failed to get expense item: %w", err)
	}
	return &expenseItem, nil
}

func (s *ExpenseItemService) UpdateExpenseItem(id uint, req UpdateExpenseItemRequest, userID uint) (*ExpenseItem, error) {
	// Validate required fields
	if req.ExpenseTypeID == 0 {
		return nil, errors.New("expense type ID is required")
	}
	if req.Year == 0 {
		return nil, errors.New("year is required")
	}
	if req.Month < 1 || req.Month > 12 {
		return nil, errors.New("month must be between 1 and 12")
	}
	if req.Amount == "" {
		return nil, errors.New("amount is required")
	}

	// Validate amount format
	amount, success := new(big.Float).SetString(req.Amount)
	if !success {
		return nil, errors.New("invalid amount format")
	}
	if amount.Cmp(big.NewFloat(0)) <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}

	// Validate year constraints
	currentYear := 2025
	if req.Year < 2000 || req.Year > currentYear+5 {
		return nil, fmt.Errorf("year must be between 2000 and %d", currentYear+5)
	}

	// Get existing expense item
	var expenseItem ExpenseItem
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&expenseItem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expense item not found")
		}
		return nil, fmt.Errorf("failed to get expense item: %w", err)
	}

	// Verify expense type exists and belongs to user
	var expenseType ExpenseType
	if err := s.db.Where("id = ? AND user_id = ?", req.ExpenseTypeID, userID).First(&expenseType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("expense type not found")
		}
		return nil, fmt.Errorf("failed to verify expense type: %w", err)
	}

	// If bill payment ID is provided, verify it exists and belongs to user
	if req.BillPaymentID != nil {
		var billPayment bills.BillPayment
		if err := s.db.Where("id = ? AND user_id = ?", *req.BillPaymentID, userID).First(&billPayment).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, errors.New("bill payment not found")
			}
			return nil, fmt.Errorf("failed to verify bill payment: %w", err)
		}
	}

	// Update fields
	expenseItem.BillPaymentID = req.BillPaymentID
	expenseItem.ExpenseTypeID = req.ExpenseTypeID
	expenseItem.Year = req.Year
	expenseItem.Month = req.Month
	expenseItem.Amount = req.Amount
	expenseItem.Note = req.Note

	if err := s.db.Save(&expenseItem).Error; err != nil {
		return nil, fmt.Errorf("failed to update expense item: %w", err)
	}

	// Load associations
	if err := s.db.Preload("ExpenseType").Preload("BillPayment").First(&expenseItem, expenseItem.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load expense item with associations: %w", err)
	}

	return &expenseItem, nil
}

func (s *ExpenseItemService) DeleteExpenseItem(id uint, userID uint) error {
	var expenseItem ExpenseItem
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&expenseItem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("expense item not found")
		}
		return fmt.Errorf("failed to get expense item: %w", err)
	}

	if err := s.db.Delete(&expenseItem).Error; err != nil {
		return fmt.Errorf("failed to delete expense item: %w", err)
	}

	return nil
}

func (s *ExpenseItemService) ListExpenseItems(userID uint, expenseTypeID *uint, billPaymentID *uint, year *int, month *int, limit, offset int) (*ExpenseItemListResponse, error) {
	query := s.db.Where("user_id = ?", userID)

	// Apply filters
	if expenseTypeID != nil {
		query = query.Where("expense_type_id = ?", *expenseTypeID)
	}
	if billPaymentID != nil {
		query = query.Where("bill_payment_id = ?", *billPaymentID)
	}
	if year != nil {
		query = query.Where("year = ?", *year)
	}
	if month != nil {
		query = query.Where("month = ?", *month)
	}

	// Get total count
	var total int64
	if err := query.Model(&ExpenseItem{}).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count expense items: %w", err)
	}

	// Get expense items with pagination and associations
	var expenseItems []ExpenseItem
	if err := query.Preload("ExpenseType").Preload("BillPayment").
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&expenseItems).Error; err != nil {
		return nil, fmt.Errorf("failed to list expense items: %w", err)
	}

	return &ExpenseItemListResponse{
		ExpenseItems: expenseItems,
		Total:        total,
	}, nil
}

// GetExpenseItemsByMonth returns expense items for a specific month with summary data
func (s *ExpenseItemService) GetExpenseItemsByMonth(userID uint, year int, month int) ([]ExpenseItem, *big.Float, error) {
	var expenseItems []ExpenseItem
	if err := s.db.Preload("ExpenseType").Preload("BillPayment").
		Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		Order("created_at DESC").
		Find(&expenseItems).Error; err != nil {
		return nil, nil, fmt.Errorf("failed to get expense items by month: %w", err)
	}

	// Calculate total amount
	total := big.NewFloat(0)
	for _, item := range expenseItems {
		amount := item.GetAmountAsBigFloat()
		total.Add(total, amount)
	}

	return expenseItems, total, nil
}
