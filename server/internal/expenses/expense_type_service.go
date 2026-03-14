package expenses

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

var (
	ErrExpenseTypeNotFound       = errors.New("expense type not found")
	ErrExpenseTypeNameExists     = errors.New("expense type name already exists")
	ErrEmptyExpenseTypeName      = errors.New("expense type name cannot be empty")
	ErrInvalidExpenseParent      = errors.New("expense type parent must be a top-level expense type")
	ErrInvalidRecurringType      = errors.New("invalid recurring type")
	ErrInvalidRecurringPeriod    = errors.New("invalid recurring period")
	ErrInvalidRecurringDueDay    = errors.New("recurring due day must be between 1 and 31")
	ErrFlexiblePostponeOnly      = errors.New("only flexible expense types can be postponed")
	ErrExpenseTypeInUse          = errors.New("cannot delete expense type that is in use")
	ErrExpenseTypeCycleReference = errors.New("expense type cannot reference itself as parent")
)

type ExpenseTypeService struct {
	db *gorm.DB
}

type CreateExpenseTypeRequest struct {
	ParentID        *uint   `json:"parent_id"`
	Name            string  `json:"name"`
	Icon            string  `json:"icon"`
	Color           string  `json:"color"`
	Description     string  `json:"description"`
	DefaultAmount   float64 `json:"default_amount"`
	DefaultWalletID *uint   `json:"default_wallet_id"`
	RecurringType   string  `json:"recurring_type"`
	RecurringPeriod string  `json:"recurring_period"`
	RecurringDueDay int     `json:"recurring_due_day"`
	NextDueDay      *string `json:"next_due_day"`
	Stopped         bool    `json:"stopped"`
}

type UpdateExpenseTypeRequest struct {
	ParentID        *uint   `json:"parent_id"`
	Name            string  `json:"name"`
	Icon            string  `json:"icon"`
	Color           string  `json:"color"`
	Description     string  `json:"description"`
	DefaultAmount   float64 `json:"default_amount"`
	DefaultWalletID *uint   `json:"default_wallet_id"`
	RecurringType   string  `json:"recurring_type"`
	RecurringPeriod string  `json:"recurring_period"`
	RecurringDueDay int     `json:"recurring_due_day"`
	NextDueDay      *string `json:"next_due_day"`
	Stopped         bool    `json:"stopped"`
}

type PostponeExpenseTypeRequest struct {
	NextDueDay string `json:"next_due_day"`
}

type ExpenseTypeListResponse struct {
	ExpenseTypes []ExpenseType `json:"expense_types"`
	Total        int64         `json:"total"`
}

type ExpenseTypeTreeNode struct {
	ExpenseType ExpenseType   `json:"expense_type"`
	Children    []ExpenseType `json:"children"`
}

func NewExpenseTypeService(db *gorm.DB) *ExpenseTypeService {
	return &ExpenseTypeService{db: db}
}

func (s *ExpenseTypeService) CreateExpenseType(userID uint, req CreateExpenseTypeRequest) (*ExpenseType, error) {
	prepared, err := s.prepareExpenseType(userID, req.ParentID, 0, req.Name, req.Icon, req.Color, req.Description, req.DefaultAmount, req.DefaultWalletID, req.RecurringType, req.RecurringPeriod, req.RecurringDueDay, req.NextDueDay, req.Stopped, nil)
	if err != nil {
		return nil, err
	}
	if err := s.db.Create(prepared).Error; err != nil {
		return nil, fmt.Errorf("failed to create expense type: %w", err)
	}
	if err := s.db.Preload("Parent").Preload("DefaultWallet").First(prepared, prepared.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to load expense type: %w", err)
	}
	return prepared, nil
}

func (s *ExpenseTypeService) GetExpenseType(userID, expenseTypeID uint) (*ExpenseType, error) {
	var expenseType ExpenseType
	if err := s.db.Preload("Parent").Preload("DefaultWallet").Where("id = ? AND user_id = ?", expenseTypeID, userID).First(&expenseType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrExpenseTypeNotFound
		}
		return nil, fmt.Errorf("failed to get expense type: %w", err)
	}
	return &expenseType, nil
}

func (s *ExpenseTypeService) UpdateExpenseType(userID, expenseTypeID uint, req UpdateExpenseTypeRequest) (*ExpenseType, error) {
	existing, err := s.GetExpenseType(userID, expenseTypeID)
	if err != nil {
		return nil, err
	}
	prepared, err := s.prepareExpenseType(userID, req.ParentID, expenseTypeID, req.Name, req.Icon, req.Color, req.Description, req.DefaultAmount, req.DefaultWalletID, req.RecurringType, req.RecurringPeriod, req.RecurringDueDay, req.NextDueDay, req.Stopped, existing)
	if err != nil {
		return nil, err
	}
	existing.ParentID = prepared.ParentID
	existing.Name = prepared.Name
	existing.Icon = prepared.Icon
	existing.Color = prepared.Color
	existing.Description = prepared.Description
	existing.DefaultAmount = prepared.DefaultAmount
	existing.DefaultWalletID = prepared.DefaultWalletID
	existing.RecurringType = prepared.RecurringType
	existing.RecurringPeriod = prepared.RecurringPeriod
	existing.RecurringDueDay = prepared.RecurringDueDay
	existing.NextDueDay = prepared.NextDueDay
	existing.Stopped = prepared.Stopped
	if err := s.db.Save(existing).Error; err != nil {
		return nil, fmt.Errorf("failed to update expense type: %w", err)
	}
	if err := s.db.Preload("Parent").Preload("DefaultWallet").First(existing, existing.ID).Error; err != nil {
		return nil, fmt.Errorf("failed to reload expense type: %w", err)
	}
	return existing, nil
}

func (s *ExpenseTypeService) DeleteExpenseType(userID, expenseTypeID uint) error {
	if _, err := s.GetExpenseType(userID, expenseTypeID); err != nil {
		return err
	}
	var count int64
	if err := s.db.Model(&Expense{}).Where("user_id = ? AND expense_type_id = ?", userID, expenseTypeID).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to validate expense type usage: %w", err)
	}
	if count > 0 {
		return ErrExpenseTypeInUse
	}
	if err := s.db.Model(&Wallet{}).Where("user_id = ? AND default_expense_type_id = ?", userID, expenseTypeID).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to validate wallet references: %w", err)
	}
	if count > 0 {
		return ErrExpenseTypeInUse
	}
	if err := s.db.Where("id = ? AND user_id = ?", expenseTypeID, userID).Delete(&ExpenseType{}).Error; err != nil {
		return fmt.Errorf("failed to delete expense type: %w", err)
	}
	return nil
}

func (s *ExpenseTypeService) ListExpenseTypes(userID uint, limit, offset int, includeStopped bool) (*ExpenseTypeListResponse, error) {
	if limit <= 0 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}
	if offset < 0 {
		offset = 0
	}
	query := s.db.Model(&ExpenseType{}).Where("user_id = ?", userID)
	if !includeStopped {
		query = query.Where("stopped = ?", false)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count expense types: %w", err)
	}
	var expenseTypes []ExpenseType
	if err := query.Preload("Parent").Preload("DefaultWallet").Order("name ASC").Limit(limit).Offset(offset).Find(&expenseTypes).Error; err != nil {
		return nil, fmt.Errorf("failed to list expense types: %w", err)
	}
	return &ExpenseTypeListResponse{ExpenseTypes: expenseTypes, Total: total}, nil
}

func (s *ExpenseTypeService) GetExpenseTypeTree(userID uint, includeStopped bool) ([]ExpenseTypeTreeNode, error) {
	response, err := s.ListExpenseTypes(userID, 500, 0, includeStopped)
	if err != nil {
		return nil, err
	}
	childrenByParent := make(map[uint][]ExpenseType)
	roots := make([]ExpenseType, 0)
	for _, expenseType := range response.ExpenseTypes {
		if expenseType.ParentID == nil {
			roots = append(roots, expenseType)
			continue
		}
		childrenByParent[*expenseType.ParentID] = append(childrenByParent[*expenseType.ParentID], expenseType)
	}
	tree := make([]ExpenseTypeTreeNode, 0, len(roots))
	for _, root := range roots {
		children := childrenByParent[root.ID]
		if children == nil {
			children = []ExpenseType{}
		}
		tree = append(tree, ExpenseTypeTreeNode{ExpenseType: root, Children: children})
	}
	return tree, nil
}

func (s *ExpenseTypeService) PostponeExpenseType(userID, expenseTypeID uint, req PostponeExpenseTypeRequest) (*ExpenseType, error) {
	expenseType, err := s.GetExpenseType(userID, expenseTypeID)
	if err != nil {
		return nil, err
	}
	if expenseType.RecurringType != RecurringTypeFlexible {
		return nil, ErrFlexiblePostponeOnly
	}
	nextDueDay, err := ParseDateOnly(req.NextDueDay)
	if err != nil {
		return nil, err
	}
	expenseType.NextDueDay = &nextDueDay
	if err := s.db.Save(expenseType).Error; err != nil {
		return nil, fmt.Errorf("failed to postpone expense type: %w", err)
	}
	return expenseType, nil
}

func (s *ExpenseTypeService) ToggleExpenseType(userID, expenseTypeID uint) (*ExpenseType, error) {
	expenseType, err := s.GetExpenseType(userID, expenseTypeID)
	if err != nil {
		return nil, err
	}
	expenseType.Stopped = !expenseType.Stopped
	if err := s.db.Save(expenseType).Error; err != nil {
		return nil, fmt.Errorf("failed to toggle expense type: %w", err)
	}
	return expenseType, nil
}

func (s *ExpenseTypeService) prepareExpenseType(userID uint, parentID *uint, expenseTypeID uint, name, icon, color, description string, defaultAmount float64, defaultWalletID *uint, recurringType, recurringPeriod string, recurringDueDay int, nextDueDay *string, stopped bool, existing *ExpenseType) (*ExpenseType, error) {
	if strings.TrimSpace(name) == "" {
		return nil, ErrEmptyExpenseTypeName
	}
	var duplicate ExpenseType
	err := s.db.Where("user_id = ? AND LOWER(name) = LOWER(?) AND id <> ?", userID, strings.TrimSpace(name), expenseTypeID).First(&duplicate).Error
	if err == nil {
		return nil, ErrExpenseTypeNameExists
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check expense type name: %w", err)
	}
	if parentID != nil {
		if expenseTypeID != 0 && *parentID == expenseTypeID {
			return nil, ErrExpenseTypeCycleReference
		}
		var parent ExpenseType
		if err := s.db.Where("id = ? AND user_id = ?", *parentID, userID).First(&parent).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrExpenseTypeNotFound
			}
			return nil, fmt.Errorf("failed to validate parent expense type: %w", err)
		}
		if parent.ParentID != nil {
			return nil, ErrInvalidExpenseParent
		}
	}
	if defaultWalletID != nil {
		var wallet Wallet
		if err := s.db.Where("id = ? AND user_id = ?", *defaultWalletID, userID).First(&wallet).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrWalletNotFound
			}
			return nil, fmt.Errorf("failed to validate default wallet: %w", err)
		}
	}
	recurringType = normalizeRecurringType(recurringType)
	recurringPeriod = normalizeRecurringPeriod(recurringPeriod)
	if err := validateRecurring(recurringType, recurringPeriod, recurringDueDay); err != nil {
		return nil, err
	}
	prepared := &ExpenseType{
		ParentID:        parentID,
		Name:            strings.TrimSpace(name),
		Icon:            strings.TrimSpace(icon),
		Color:           strings.TrimSpace(color),
		Description:     strings.TrimSpace(description),
		DefaultAmount:   defaultAmount,
		DefaultWalletID: defaultWalletID,
		RecurringType:   recurringType,
		RecurringPeriod: recurringPeriod,
		RecurringDueDay: recurringDueDay,
		Stopped:         stopped,
		UserID:          userID,
	}
	if existing != nil {
		prepared.ID = existing.ID
		prepared.NextDueDay = existing.NextDueDay
	}
	if recurringType == RecurringTypeNone {
		prepared.NextDueDay = nil
		return prepared, nil
	}
	if nextDueDay != nil && strings.TrimSpace(*nextDueDay) != "" {
		parsedNextDueDay, err := ParseDateOnly(*nextDueDay)
		if err != nil {
			return nil, err
		}
		prepared.NextDueDay = &parsedNextDueDay
		return prepared, nil
	}
	if existing != nil && existing.RecurringType == recurringType && existing.RecurringPeriod == recurringPeriod && existing.RecurringDueDay == recurringDueDay && existing.NextDueDay != nil {
		prepared.NextDueDay = existing.NextDueDay
		return prepared, nil
	}
	// Only store next_due_day for flexible types.
	// Fixed day types compute their next due date dynamically from the last expense.
	if recurringType == RecurringTypeFixedDay {
		prepared.NextDueDay = nil
		return prepared, nil
	}
	computedNextDueDay, err := ComputeInitialNextDueDay(time.Now(), recurringType, recurringPeriod, recurringDueDay)
	if err != nil {
		return nil, err
	}
	prepared.NextDueDay = computedNextDueDay
	return prepared, nil
}

func normalizeRecurringType(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return RecurringTypeNone
	}
	return value
}

func normalizeRecurringPeriod(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return RecurringPeriodNone
	}
	return value
}

func validateRecurring(recurringType, recurringPeriod string, recurringDueDay int) error {
	switch recurringType {
	case RecurringTypeNone:
		if recurringPeriod != RecurringPeriodNone {
			return ErrInvalidRecurringPeriod
		}
		return nil
	case RecurringTypeFixedDay:
		if recurringDueDay < 1 || recurringDueDay > 31 {
			return ErrInvalidRecurringDueDay
		}
		if !isValidRecurringPeriod(recurringPeriod, false) {
			return ErrInvalidRecurringPeriod
		}
		return nil
	case RecurringTypeFlexible:
		if !isValidRecurringPeriod(recurringPeriod, true) {
			return ErrInvalidRecurringPeriod
		}
		return nil
	default:
		return ErrInvalidRecurringType
	}
}

func isValidRecurringPeriod(period string, allowWeekly bool) bool {
	switch period {
	case RecurringPeriodMonthly, RecurringPeriodBimonthly, RecurringPeriodQuarterly, RecurringPeriodFourMonths, RecurringPeriodSemiannually, RecurringPeriodAnnually:
		return true
	case RecurringPeriodWeekly, RecurringPeriodBiweekly:
		return allowWeekly
	default:
		return false
	}
}
