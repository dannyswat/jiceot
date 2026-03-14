package expenses

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

var (
	ErrExpenseRecordNotFound = errors.New("expense not found")
	ErrInvalidExpenseAmount  = errors.New("expense amount must be greater than 0")
	ErrInvalidExpenseDate    = errors.New("expense date is required")
)

type ExpenseService struct {
	db *gorm.DB
}

type CreateExpenseRequest struct {
	ExpenseTypeID uint    `json:"expense_type_id"`
	WalletID      *uint   `json:"wallet_id"`
	PaymentID     *uint   `json:"payment_id"`
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	Note          string  `json:"note"`
}

type UpdateExpenseRequest struct {
	ExpenseTypeID uint    `json:"expense_type_id"`
	WalletID      *uint   `json:"wallet_id"`
	PaymentID     *uint   `json:"payment_id"`
	Amount        float64 `json:"amount"`
	Date          string  `json:"date"`
	Note          string  `json:"note"`
}

type ExpenseListRequest struct {
	ExpenseTypeID *uint
	WalletID      *uint
	PaymentID     *uint
	From          *time.Time
	To            *time.Time
	UnbilledOnly  bool
	Limit         int
	Offset        int
}

type ExpenseListResponse struct {
	Expenses []Expense `json:"expenses"`
	Total    int64     `json:"total"`
}

func NewExpenseService(db *gorm.DB) *ExpenseService {
	return &ExpenseService{db: db}
}

func (s *ExpenseService) CreateExpense(userID uint, req CreateExpenseRequest) (*Expense, error) {
	parsedDate, expenseType, walletID, paymentID, err := s.validateExpenseInput(userID, req.ExpenseTypeID, req.WalletID, req.PaymentID, req.Amount, req.Date)
	if err != nil {
		return nil, err
	}

	expense := Expense{
		ExpenseTypeID: req.ExpenseTypeID,
		WalletID:      walletID,
		PaymentID:     paymentID,
		Amount:        req.Amount,
		Date:          parsedDate,
		Note:          req.Note,
		UserID:        userID,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&expense).Error; err != nil {
			return fmt.Errorf("failed to create expense: %w", err)
		}
		if expense.PaymentID == nil && expense.WalletID != nil {
			var wallet Wallet
			if err := tx.Where("id = ? AND user_id = ?", *expense.WalletID, userID).First(&wallet).Error; err == nil {
				if wallet.IsCash {
					matchingPaymentID, err := s.findMatchingCashPayment(tx, userID, wallet.ID, expense.Amount, expense.Date)
					if err != nil {
						return err
					}
					if matchingPaymentID != nil {
						expense.PaymentID = matchingPaymentID
						if err := tx.Model(&Expense{}).Where("id = ? AND user_id = ?", expense.ID, userID).Update("payment_id", *matchingPaymentID).Error; err != nil {
							return fmt.Errorf("failed to link matching cash payment: %w", err)
						}
					}
				} else if !wallet.IsCredit {
					paymentID, err := s.autoCreatePaymentForNormalWallet(tx, userID, wallet.ID, expense)
					if err != nil {
						return err
					}
					expense.PaymentID = paymentID
				}
			}
		}
		return s.advanceExpenseTypeDueDate(tx, userID, expenseType, expense.Date)
	})
	if err != nil {
		return nil, err
	}

	if err := s.db.Preload("ExpenseType").Preload("Wallet").Preload("Payment").First(&expense, expense.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load expense: %w", err)
	}
	return &expense, nil
}

func (s *ExpenseService) GetExpense(userID, expenseID uint) (*Expense, error) {
	var expense Expense
	if err := s.db.Preload("ExpenseType").Preload("Wallet").Preload("Payment").Where("id = ? AND user_id = ?", expenseID, userID).First(&expense).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrExpenseRecordNotFound
		}
		return nil, fmt.Errorf("failed to get expense: %w", err)
	}
	return &expense, nil
}

func (s *ExpenseService) UpdateExpense(userID, expenseID uint, req UpdateExpenseRequest) (*Expense, error) {
	parsedDate, _, walletID, paymentID, err := s.validateExpenseInput(userID, req.ExpenseTypeID, req.WalletID, req.PaymentID, req.Amount, req.Date)
	if err != nil {
		return nil, err
	}
	expense, err := s.GetExpense(userID, expenseID)
	if err != nil {
		return nil, err
	}
	expense.ExpenseTypeID = req.ExpenseTypeID
	expense.WalletID = walletID
	expense.PaymentID = paymentID
	expense.Amount = req.Amount
	expense.Date = parsedDate
	expense.Note = req.Note
	if err := s.db.Save(expense).Error; err != nil {
		return nil, fmt.Errorf("failed to update expense: %w", err)
	}
	if err := s.db.Preload("ExpenseType").Preload("Wallet").Preload("Payment").First(expense, expense.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload expense: %w", err)
	}
	return expense, nil
}

func (s *ExpenseService) DeleteExpense(userID, expenseID uint) error {
	expense, err := s.GetExpense(userID, expenseID)
	if err != nil {
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", expenseID, userID).Delete(&Expense{}).Error; err != nil {
			return fmt.Errorf("failed to delete expense: %w", err)
		}
		return s.recalcFlexibleDueDate(tx, userID, expense.ExpenseTypeID)
	})
}

func (s *ExpenseService) ListExpenses(userID uint, req ExpenseListRequest) (*ExpenseListResponse, error) {
	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.Limit > 200 {
		req.Limit = 200
	}
	if req.Offset < 0 {
		req.Offset = 0
	}

	query := s.db.Model(&Expense{}).Where("user_id = ?", userID)
	if req.ExpenseTypeID != nil {
		query = query.Where("expense_type_id = ?", *req.ExpenseTypeID)
	}
	if req.WalletID != nil {
		query = query.Where("wallet_id = ?", *req.WalletID)
	}
	if req.PaymentID != nil {
		query = query.Where("payment_id = ?", *req.PaymentID)
	}
	if req.From != nil {
		query = query.Where("date >= ?", NormalizeDateOnly(*req.From))
	}
	if req.To != nil {
		query = query.Where("date <= ?", NormalizeDateOnly(*req.To))
	}
	if req.UnbilledOnly {
		query = query.Where("wallet_id IS NOT NULL AND payment_id IS NULL")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count expenses: %w", err)
	}

	var expenses []Expense
	if err := query.Preload("ExpenseType").Preload("Wallet").Preload("Payment").Order("date DESC, created_at DESC").Limit(req.Limit).Offset(req.Offset).Find(&expenses).Error; err != nil {
		return nil, fmt.Errorf("failed to list expenses: %w", err)
	}

	return &ExpenseListResponse{Expenses: expenses, Total: total}, nil
}

func (s *ExpenseService) validateExpenseInput(userID, expenseTypeID uint, walletID, paymentID *uint, amount float64, date string) (time.Time, *ExpenseType, *uint, *uint, error) {
	if expenseTypeID == 0 {
		return time.Time{}, nil, nil, nil, ErrExpenseTypeNotFound
	}
	if amount <= 0 {
		return time.Time{}, nil, nil, nil, ErrInvalidExpenseAmount
	}
	if date == "" {
		return time.Time{}, nil, nil, nil, ErrInvalidExpenseDate
	}
	parsedDate, err := ParseDateOnly(date)
	if err != nil {
		return time.Time{}, nil, nil, nil, err
	}
	var expenseType ExpenseType
	if err := s.db.Where("id = ? AND user_id = ?", expenseTypeID, userID).First(&expenseType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return time.Time{}, nil, nil, nil, ErrExpenseTypeNotFound
		}
		return time.Time{}, nil, nil, nil, fmt.Errorf("failed to load expense type: %w", err)
	}
	resolvedWalletID := walletID
	if resolvedWalletID == nil && expenseType.DefaultWalletID != nil {
		resolvedWalletID = expenseType.DefaultWalletID
	}
	if resolvedWalletID != nil {
		var wallet Wallet
		if err := s.db.Where("id = ? AND user_id = ?", *resolvedWalletID, userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return time.Time{}, nil, nil, nil, ErrWalletNotFound
			}
			return time.Time{}, nil, nil, nil, fmt.Errorf("failed to load wallet: %w", err)
		}
	}
	resolvedPaymentID := paymentID
	if paymentID != nil {
		var payment Payment
		if err := s.db.Where("id = ? AND user_id = ?", *paymentID, userID).First(&payment).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return time.Time{}, nil, nil, nil, ErrPaymentNotFound
			}
			return time.Time{}, nil, nil, nil, fmt.Errorf("failed to load payment: %w", err)
		}
		resolvedPaymentID = &payment.ID
		if resolvedWalletID == nil {
			resolvedWalletID = &payment.WalletID
		} else if *resolvedWalletID != payment.WalletID {
			return time.Time{}, nil, nil, nil, errors.New("payment wallet does not match expense wallet")
		}
	}
	return parsedDate, &expenseType, resolvedWalletID, resolvedPaymentID, nil
}

func (s *ExpenseService) findMatchingCashPayment(tx *gorm.DB, userID, walletID uint, amount float64, date time.Time) (*uint, error) {
	var payment Payment
	err := tx.Where("user_id = ? AND wallet_id = ? AND amount = ? AND date = ?", userID, walletID, amount, NormalizeDateOnly(date)).Order("created_at DESC").First(&payment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find matching cash payment: %w", err)
	}
	return &payment.ID, nil
}

func (s *ExpenseService) advanceExpenseTypeDueDate(tx *gorm.DB, userID uint, expenseType *ExpenseType, expenseDate time.Time) error {
	if expenseType == nil || expenseType.RecurringType == RecurringTypeNone {
		return nil
	}
	// Only advance stored next_due_day for flexible types.
	// Fixed day types compute their next due date dynamically from the last expense.
	if expenseType.RecurringType != RecurringTypeFlexible {
		return nil
	}
	nextDueDay, err := AdvanceNextDueDayFrom(expenseDate, expenseType.RecurringType, expenseType.RecurringPeriod, expenseType.RecurringDueDay)
	if err != nil {
		return err
	}
	if err := tx.Model(&ExpenseType{}).Where("id = ? AND user_id = ?", expenseType.ID, userID).Update("next_due_day", nextDueDay).Error; err != nil {
		return fmt.Errorf("failed to advance next due day: %w", err)
	}
	return nil
}

// recalcFlexibleDueDate recomputes next_due_day for a flexible expense type
// based on the most recent remaining expense, or resets to now if none remain.
func (s *ExpenseService) recalcFlexibleDueDate(tx *gorm.DB, userID, expenseTypeID uint) error {
	var expenseType ExpenseType
	if err := tx.Where("id = ? AND user_id = ?", expenseTypeID, userID).First(&expenseType).Error; err != nil {
		return nil // type not found or deleted, nothing to do
	}
	if expenseType.RecurringType != RecurringTypeFlexible {
		return nil
	}

	// Find the most recent expense for this type
	var lastExpense Expense
	err := tx.Where("expense_type_id = ? AND user_id = ?", expenseTypeID, userID).Order("date DESC").First(&lastExpense).Error
	if err != nil {
		// No expenses remain — reset to today
		now := NormalizeDateOnly(time.Now())
		if err := tx.Model(&ExpenseType{}).Where("id = ? AND user_id = ?", expenseTypeID, userID).Update("next_due_day", now).Error; err != nil {
			return fmt.Errorf("failed to reset next due day: %w", err)
		}
		return nil
	}

	nextDueDay, err := AdvanceNextDueDayFrom(lastExpense.Date, expenseType.RecurringType, expenseType.RecurringPeriod, expenseType.RecurringDueDay)
	if err != nil {
		return err
	}
	if err := tx.Model(&ExpenseType{}).Where("id = ? AND user_id = ?", expenseTypeID, userID).Update("next_due_day", nextDueDay).Error; err != nil {
		return fmt.Errorf("failed to recalculate next due day: %w", err)
	}
	return nil
}

func (s *ExpenseService) autoCreatePaymentForNormalWallet(tx *gorm.DB, userID, walletID uint, expense Expense) (*uint, error) {
	payment := Payment{
		WalletID: walletID,
		Amount:   expense.Amount,
		Date:     expense.Date,
		Note:     expense.Note,
		UserID:   userID,
	}
	if err := tx.Create(&payment).Error; err != nil {
		return nil, fmt.Errorf("failed to auto-create payment: %w", err)
	}
	if err := tx.Model(&Expense{}).Where("id = ? AND user_id = ?", expense.ID, userID).Update("payment_id", payment.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to link auto-created payment: %w", err)
	}
	return &payment.ID, nil
}
