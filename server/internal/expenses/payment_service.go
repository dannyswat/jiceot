package expenses

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

var (
	ErrPaymentNotFound      = errors.New("payment not found")
	ErrInvalidPaymentAmount = errors.New("payment amount must be greater than 0")
	ErrInvalidPaymentDate   = errors.New("payment date is required")
	ErrExpenseNotFound      = errors.New("expense not found")
)

type PaymentService struct {
	db *gorm.DB
}

type CreatePaymentRequest struct {
	WalletID   uint    `json:"wallet_id"`
	Amount     float64 `json:"amount"`
	Date       string  `json:"date"`
	Note       string  `json:"note"`
	ExpenseIDs []uint  `json:"expense_ids"`
}

type UpdatePaymentRequest struct {
	WalletID   uint    `json:"wallet_id"`
	Amount     float64 `json:"amount"`
	Date       string  `json:"date"`
	Note       string  `json:"note"`
	ExpenseIDs []uint  `json:"expense_ids"`
}

type PaymentListRequest struct {
	WalletID *uint
	From     *time.Time
	To       *time.Time
	Limit    int
	Offset   int
}

type PaymentListResponse struct {
	Payments []Payment `json:"payments"`
	Total    int64     `json:"total"`
}

func NewPaymentService(db *gorm.DB) *PaymentService {
	return &PaymentService{db: db}
}

func (s *PaymentService) CreatePayment(userID uint, req CreatePaymentRequest) (*Payment, error) {
	parsedDate, wallet, err := s.validatePaymentInput(userID, req.WalletID, req.Amount, req.Date)
	if err != nil {
		return nil, err
	}

	var payment Payment
	err = s.db.Transaction(func(tx *gorm.DB) error {
		payment = Payment{
			WalletID: req.WalletID,
			Amount:   req.Amount,
			Date:     parsedDate,
			Note:     req.Note,
			UserID:   userID,
		}
		if err := tx.Create(&payment).Error; err != nil {
			return fmt.Errorf("failed to create payment: %w", err)
		}

		if err := s.replacePaymentExpenses(tx, userID, payment.ID, payment.WalletID, req.ExpenseIDs); err != nil {
			return err
		}

		if len(req.ExpenseIDs) == 0 {
			if err := s.autoCreateDefaultExpense(tx, userID, wallet, payment); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	if err := s.db.Preload("Wallet").First(&payment, payment.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load payment: %w", err)
	}
	return &payment, nil
}

func (s *PaymentService) GetPayment(userID, paymentID uint) (*Payment, error) {
	var payment Payment
	if err := s.db.Preload("Wallet").Where("id = ? AND user_id = ?", paymentID, userID).First(&payment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrPaymentNotFound
		}
		return nil, fmt.Errorf("failed to get payment: %w", err)
	}
	return &payment, nil
}

func (s *PaymentService) UpdatePayment(userID, paymentID uint, req UpdatePaymentRequest) (*Payment, error) {
	parsedDate, _, err := s.validatePaymentInput(userID, req.WalletID, req.Amount, req.Date)
	if err != nil {
		return nil, err
	}

	payment, err := s.GetPayment(userID, paymentID)
	if err != nil {
		return nil, err
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		payment.WalletID = req.WalletID
		payment.Amount = req.Amount
		payment.Date = parsedDate
		payment.Note = req.Note
		if err := tx.Save(payment).Error; err != nil {
			return fmt.Errorf("failed to update payment: %w", err)
		}
		if err := tx.Model(&Expense{}).Where("user_id = ? AND payment_id = ?", userID, paymentID).Update("payment_id", nil).Error; err != nil {
			return fmt.Errorf("failed to clear payment expenses: %w", err)
		}
		return s.replacePaymentExpenses(tx, userID, payment.ID, payment.WalletID, req.ExpenseIDs)
	})
	if err != nil {
		return nil, err
	}

	if err := s.db.Preload("Wallet").First(payment, payment.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload payment: %w", err)
	}
	return payment, nil
}

func (s *PaymentService) DeletePayment(userID, paymentID uint) error {
	if _, err := s.GetPayment(userID, paymentID); err != nil {
		return err
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&Expense{}).Where("user_id = ? AND payment_id = ?", userID, paymentID).Update("payment_id", nil).Error; err != nil {
			return fmt.Errorf("failed to unlink expenses: %w", err)
		}
		if err := tx.Where("id = ? AND user_id = ?", paymentID, userID).Delete(&Payment{}).Error; err != nil {
			return fmt.Errorf("failed to delete payment: %w", err)
		}
		return nil
	})
}

func (s *PaymentService) ListPayments(userID uint, req PaymentListRequest) (*PaymentListResponse, error) {
	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.Limit > 200 {
		req.Limit = 200
	}
	if req.Offset < 0 {
		req.Offset = 0
	}

	query := s.db.Model(&Payment{}).Where("user_id = ?", userID)
	if req.WalletID != nil {
		query = query.Where("wallet_id = ?", *req.WalletID)
	}
	if req.From != nil {
		query = query.Where("date >= ?", NormalizeDateOnly(*req.From))
	}
	if req.To != nil {
		query = query.Where("date <= ?", NormalizeDateOnly(*req.To))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count payments: %w", err)
	}

	var payments []Payment
	if err := query.Preload("Wallet").Order("date DESC, created_at DESC").Limit(req.Limit).Offset(req.Offset).Find(&payments).Error; err != nil {
		return nil, fmt.Errorf("failed to list payments: %w", err)
	}

	return &PaymentListResponse{Payments: payments, Total: total}, nil
}

func (s *PaymentService) GetMonthlyTotal(userID uint, from, to time.Time) (float64, error) {
	from = NormalizeDateOnly(from)
	to = NormalizeDateOnly(to)
	var total float64
	if err := s.db.Model(&Payment{}).Where("user_id = ? AND date >= ? AND date <= ?", userID, from, to).Select("COALESCE(SUM(amount), 0)").Scan(&total).Error; err != nil {
		return 0, fmt.Errorf("failed to calculate payment total: %w", err)
	}
	return total, nil
}

func (s *PaymentService) validatePaymentInput(userID, walletID uint, amount float64, date string) (time.Time, *Wallet, error) {
	if walletID == 0 {
		return time.Time{}, nil, ErrWalletNotFound
	}
	if amount <= 0 {
		return time.Time{}, nil, ErrInvalidPaymentAmount
	}
	if date == "" {
		return time.Time{}, nil, ErrInvalidPaymentDate
	}
	parsedDate, err := ParseDateOnly(date)
	if err != nil {
		return time.Time{}, nil, err
	}
	var wallet Wallet
	if err := s.db.Where("id = ? AND user_id = ?", walletID, userID).First(&wallet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return time.Time{}, nil, ErrWalletNotFound
		}
		return time.Time{}, nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return parsedDate, &wallet, nil
}

func (s *PaymentService) replacePaymentExpenses(tx *gorm.DB, userID, paymentID, walletID uint, expenseIDs []uint) error {
	if len(expenseIDs) == 0 {
		return nil
	}
	var expenses []Expense
	if err := tx.Where("user_id = ? AND id IN ?", userID, expenseIDs).Find(&expenses).Error; err != nil {
		return fmt.Errorf("failed to load expenses: %w", err)
	}
	if len(expenses) != len(expenseIDs) {
		return ErrExpenseNotFound
	}
	for _, expense := range expenses {
		if expense.WalletID != nil && *expense.WalletID != walletID {
			return errors.New("expense wallet does not match payment wallet")
		}
		updates := map[string]interface{}{"payment_id": paymentID}
		if expense.WalletID == nil {
			updates["wallet_id"] = walletID
		}
		if err := tx.Model(&Expense{}).Where("id = ? AND user_id = ?", expense.ID, userID).Updates(updates).Error; err != nil {
			return fmt.Errorf("failed to link expense to payment: %w", err)
		}
	}
	return nil
}

func (s *PaymentService) autoCreateDefaultExpense(tx *gorm.DB, userID uint, wallet *Wallet, payment Payment) error {
	if wallet == nil || wallet.DefaultExpenseTypeID == nil {
		return nil
	}
	if wallet.IsCash {
		return nil
	}
	var expenseType ExpenseType
	if err := tx.Where("id = ? AND user_id = ?", *wallet.DefaultExpenseTypeID, userID).First(&expenseType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return fmt.Errorf("failed to load default expense type: %w", err)
	}
	expense := Expense{
		ExpenseTypeID: expenseType.ID,
		WalletID:      &payment.WalletID,
		PaymentID:     &payment.ID,
		Amount:        payment.Amount,
		Date:          payment.Date,
		Note:          payment.Note,
		UserID:        userID,
	}
	if err := tx.Create(&expense).Error; err != nil {
		return fmt.Errorf("failed to auto-create payment expense: %w", err)
	}
	if expenseType.RecurringType != RecurringTypeNone {
		nextDueDay, err := AdvanceNextDueDayFrom(expense.Date, expenseType.RecurringType, expenseType.RecurringPeriod, expenseType.RecurringDueDay)
		if err != nil {
			return err
		}
		if err := tx.Model(&ExpenseType{}).Where("id = ? AND user_id = ?", expenseType.ID, userID).Update("next_due_day", nextDueDay).Error; err != nil {
			return fmt.Errorf("failed to advance expense type due date: %w", err)
		}
	}
	return nil
}
