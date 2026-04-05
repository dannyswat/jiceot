package expenses

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrWalletNotFound      = errors.New("wallet not found")
	ErrWalletNameExists    = errors.New("wallet name already exists")
	ErrEmptyWalletName     = errors.New("wallet name cannot be empty")
	ErrInvalidWalletType   = errors.New("wallet cannot be both credit and cash")
	ErrInvalidWalletPeriod = errors.New("invalid wallet bill period")
	ErrInvalidWalletDueDay = errors.New("wallet due day must be between 0 and 31")
)

type WalletService struct {
	db *gorm.DB
}

type CreateWalletRequest struct {
	Name                 string `json:"name"`
	Icon                 string `json:"icon"`
	Color                string `json:"color"`
	Description          string `json:"description"`
	IsCredit             bool   `json:"is_credit"`
	IsCash               bool   `json:"is_cash"`
	BillPeriod           string `json:"bill_period"`
	BillDueDay           int    `json:"bill_due_day"`
	DefaultExpenseTypeID *uint  `json:"default_expense_type_id"`
}

type UpdateWalletRequest struct {
	Name                 string `json:"name"`
	Icon                 string `json:"icon"`
	Color                string `json:"color"`
	Description          string `json:"description"`
	IsCredit             bool   `json:"is_credit"`
	IsCash               bool   `json:"is_cash"`
	BillPeriod           string `json:"bill_period"`
	BillDueDay           int    `json:"bill_due_day"`
	DefaultExpenseTypeID *uint  `json:"default_expense_type_id"`
	Stopped              bool   `json:"stopped"`
}

type WalletListResponse struct {
	Wallets []Wallet `json:"wallets"`
	Total   int64    `json:"total"`
}

func NewWalletService(db *gorm.DB) *WalletService {
	return &WalletService{db: db}
}

func (s *WalletService) CreateWallet(userID uint, req CreateWalletRequest) (*Wallet, error) {
	if err := s.validateWalletInput(userID, req.Name, req.IsCredit, req.IsCash, req.BillPeriod, req.BillDueDay, req.DefaultExpenseTypeID, 0); err != nil {
		return nil, err
	}

	var existing Wallet
	err := s.db.Where("user_id = ? AND LOWER(name) = LOWER(?)", userID, strings.TrimSpace(req.Name)).First(&existing).Error
	if err == nil {
		return nil, ErrWalletNameExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check wallet name: %w", err)
	}

	wallet := Wallet{
		Name:                 strings.TrimSpace(req.Name),
		Icon:                 strings.TrimSpace(req.Icon),
		Color:                strings.TrimSpace(req.Color),
		Description:          strings.TrimSpace(req.Description),
		IsCredit:             req.IsCredit,
		IsCash:               req.IsCash,
		BillPeriod:           normalizeWalletPeriod(req.BillPeriod),
		BillDueDay:           req.BillDueDay,
		DefaultExpenseTypeID: req.DefaultExpenseTypeID,
		UserID:               userID,
	}

	if err := s.db.Create(&wallet).Error; err != nil {
		return nil, fmt.Errorf("failed to create wallet: %w", err)
	}

	if err := s.db.Preload("DefaultExpenseType").First(&wallet, wallet.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load wallet: %w", err)
	}

	return &wallet, nil
}

func (s *WalletService) GetWallet(userID, walletID uint) (*Wallet, error) {
	var wallet Wallet
	if err := s.db.Preload("DefaultExpenseType").Where("id = ? AND user_id = ?", walletID, userID).First(&wallet).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWalletNotFound
		}
		return nil, fmt.Errorf("failed to get wallet: %w", err)
	}
	return &wallet, nil
}

func (s *WalletService) UpdateWallet(userID, walletID uint, req UpdateWalletRequest) (*Wallet, error) {
	if err := s.validateWalletInput(userID, req.Name, req.IsCredit, req.IsCash, req.BillPeriod, req.BillDueDay, req.DefaultExpenseTypeID, walletID); err != nil {
		return nil, err
	}

	wallet, err := s.GetWallet(userID, walletID)
	if err != nil {
		return nil, err
	}

	var existing Wallet
	err = s.db.Where("user_id = ? AND LOWER(name) = LOWER(?) AND id <> ?", userID, strings.TrimSpace(req.Name), walletID).First(&existing).Error
	if err == nil {
		return nil, ErrWalletNameExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check wallet name: %w", err)
	}

	wallet.Name = strings.TrimSpace(req.Name)
	wallet.Icon = strings.TrimSpace(req.Icon)
	wallet.Color = strings.TrimSpace(req.Color)
	wallet.Description = strings.TrimSpace(req.Description)
	wallet.IsCredit = req.IsCredit
	wallet.IsCash = req.IsCash
	wallet.BillPeriod = normalizeWalletPeriod(req.BillPeriod)
	wallet.BillDueDay = req.BillDueDay
	wallet.DefaultExpenseTypeID = req.DefaultExpenseTypeID
	wallet.Stopped = req.Stopped

	if err := s.db.Save(wallet).Error; err != nil {
		return nil, fmt.Errorf("failed to update wallet: %w", err)
	}

	if err := s.db.Preload("DefaultExpenseType").First(wallet, wallet.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload wallet: %w", err)
	}

	return wallet, nil
}

func (s *WalletService) DeleteWallet(userID, walletID uint) error {
	if _, err := s.GetWallet(userID, walletID); err != nil {
		return err
	}
	if err := s.db.Where("id = ? AND user_id = ?", walletID, userID).Delete(&Wallet{}).Error; err != nil {
		return fmt.Errorf("failed to delete wallet: %w", err)
	}
	return nil
}

func (s *WalletService) ListWallets(userID uint, limit, offset int, walletType string, includeStopped bool) (*WalletListResponse, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}

	query := s.db.Model(&Wallet{}).Where("user_id = ?", userID)
	if !includeStopped {
		query = query.Where("stopped = ?", false)
	}

	switch strings.ToLower(strings.TrimSpace(walletType)) {
	case "credit":
		query = query.Where("is_credit = ?", true)
	case "cash":
		query = query.Where("is_cash = ?", true)
	case "normal":
		query = query.Where("is_credit = ? AND is_cash = ?", false, false)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count wallets: %w", err)
	}

	var wallets []Wallet
	if err := query.Preload("DefaultExpenseType").Order("name ASC").Limit(limit).Offset(offset).Find(&wallets).Error; err != nil {
		return nil, fmt.Errorf("failed to list wallets: %w", err)
	}

	return &WalletListResponse{Wallets: wallets, Total: total}, nil
}

func (s *WalletService) ToggleWallet(userID, walletID uint) (*Wallet, error) {
	wallet, err := s.GetWallet(userID, walletID)
	if err != nil {
		return nil, err
	}
	wallet.Stopped = !wallet.Stopped
	if err := s.db.Save(wallet).Error; err != nil {
		return nil, fmt.Errorf("failed to toggle wallet: %w", err)
	}
	return wallet, nil
}

func (s *WalletService) GetWalletPayments(userID, walletID uint) ([]Payment, error) {
	if _, err := s.GetWallet(userID, walletID); err != nil {
		return nil, err
	}
	var payments []Payment
	if err := s.db.Where("user_id = ? AND wallet_id = ?", userID, walletID).Order("date DESC, created_at DESC").Find(&payments).Error; err != nil {
		return nil, fmt.Errorf("failed to get wallet payments: %w", err)
	}
	return payments, nil
}

func (s *WalletService) GetWalletUnbilledExpenses(userID, walletID uint) ([]Expense, error) {
	if _, err := s.GetWallet(userID, walletID); err != nil {
		return nil, err
	}
	var expenses []Expense
	if err := s.db.Preload("ExpenseType").Where("user_id = ? AND wallet_id = ? AND payment_id IS NULL", userID, walletID).Order("date DESC, created_at DESC").Find(&expenses).Error; err != nil {
		return nil, fmt.Errorf("failed to get unbilled expenses: %w", err)
	}
	return expenses, nil
}

func (s *WalletService) validateWalletInput(userID uint, name string, isCredit, isCash bool, billPeriod string, billDueDay int, defaultExpenseTypeID *uint, excludeWalletID uint) error {
	if strings.TrimSpace(name) == "" {
		return ErrEmptyWalletName
	}
	if isCredit && isCash {
		return ErrInvalidWalletType
	}
	if billDueDay < 0 || billDueDay > 31 {
		return ErrInvalidWalletDueDay
	}
	if !isValidWalletPeriod(normalizeWalletPeriod(billPeriod)) {
		return ErrInvalidWalletPeriod
	}
	if defaultExpenseTypeID != nil {
		var count int64
		query := s.db.Model(&ExpenseType{}).Where("id = ? AND user_id = ?", *defaultExpenseTypeID, userID)
		if excludeWalletID != 0 {
			query = query.Where("id <> ?", excludeWalletID)
		}
		if err := query.Count(&count).Error; err != nil {
			return fmt.Errorf("failed to validate default expense type: %w", err)
		}
		if count == 0 {
			return ErrExpenseTypeNotFound
		}
	}
	return nil
}

func normalizeWalletPeriod(period string) string {
	period = strings.ToLower(strings.TrimSpace(period))
	if period == "" {
		return WalletPeriodNone
	}
	return period
}

func isValidWalletPeriod(period string) bool {
	switch period {
	case WalletPeriodNone, WalletPeriodMonthly, WalletPeriodBimonthly, WalletPeriodQuarterly, WalletPeriodFourMonths, WalletPeriodSemiannually, WalletPeriodAnnually:
		return true
	default:
		return false
	}
}
