package expenses

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

var (
	ErrExpenseTypeNotFound   = errors.New("expense type not found")
	ErrExpenseTypeNameExists = errors.New("expense type name already exists")
	ErrEmptyExpenseTypeName  = errors.New("expense type name cannot be empty")
)

type ExpenseTypeService struct {
	db *gorm.DB
}

type CreateExpenseTypeRequest struct {
	Name  string `json:"name" validate:"required,min=1"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type UpdateExpenseTypeRequest struct {
	Name  string `json:"name" validate:"required,min=1"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type ExpenseTypeListResponse struct {
	ExpenseTypes []ExpenseType `json:"expense_types"`
	Total        int64         `json:"total"`
}

func NewExpenseTypeService(db *gorm.DB) *ExpenseTypeService {
	return &ExpenseTypeService{db: db}
}

// CreateExpenseType creates a new expense type
func (s *ExpenseTypeService) CreateExpenseType(userID uint, req CreateExpenseTypeRequest) (*ExpenseType, error) {
	if err := s.validateCreateExpenseTypeRequest(req); err != nil {
		return nil, err
	}

	// Check if expense type name already exists for this user
	var existingExpenseType ExpenseType
	err := s.db.Where("name = ? AND user_id = ?", req.Name, userID).First(&existingExpenseType).Error
	if err == nil {
		return nil, ErrExpenseTypeNameExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	expenseType := ExpenseType{
		Name:   req.Name,
		Icon:   req.Icon,
		Color:  req.Color,
		UserID: userID,
	}

	if err := s.db.Create(&expenseType).Error; err != nil {
		return nil, err
	}

	return &expenseType, nil
}

// GetExpenseType retrieves an expense type by ID
func (s *ExpenseTypeService) GetExpenseType(userID, expenseTypeID uint) (*ExpenseType, error) {
	var expenseType ExpenseType
	err := s.db.Where("id = ? AND user_id = ?", expenseTypeID, userID).First(&expenseType).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrExpenseTypeNotFound
		}
		return nil, err
	}
	return &expenseType, nil
}

// UpdateExpenseType updates an existing expense type
func (s *ExpenseTypeService) UpdateExpenseType(userID, expenseTypeID uint, req UpdateExpenseTypeRequest) (*ExpenseType, error) {
	if err := s.validateUpdateExpenseTypeRequest(req); err != nil {
		return nil, err
	}

	var expenseType ExpenseType
	err := s.db.Where("id = ? AND user_id = ?", expenseTypeID, userID).First(&expenseType).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrExpenseTypeNotFound
		}
		return nil, err
	}

	// Check if new name conflicts with existing expense type (excluding current one)
	if req.Name != expenseType.Name {
		var existingExpenseType ExpenseType
		err := s.db.Where("name = ? AND user_id = ? AND id != ?", req.Name, userID, expenseTypeID).First(&existingExpenseType).Error
		if err == nil {
			return nil, ErrExpenseTypeNameExists
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	expenseType.Name = req.Name
	expenseType.Icon = req.Icon
	expenseType.Color = req.Color

	if err := s.db.Save(&expenseType).Error; err != nil {
		return nil, err
	}

	return &expenseType, nil
}

// DeleteExpenseType deletes an expense type
func (s *ExpenseTypeService) DeleteExpenseType(userID, expenseTypeID uint) error {
	// Check if expense type is being used by any expense items
	var count int64
	err := s.db.Model(&ExpenseItem{}).Where("expense_type_id = ? AND user_id = ?", expenseTypeID, userID).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return errors.New("cannot delete expense type that is being used by expense items")
	}

	result := s.db.Where("id = ? AND user_id = ?", expenseTypeID, userID).Delete(&ExpenseType{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrExpenseTypeNotFound
	}
	return nil
}

// ListExpenseTypes retrieves expense types for a user with optional pagination
func (s *ExpenseTypeService) ListExpenseTypes(userID uint, limit, offset int) (*ExpenseTypeListResponse, error) {
	query := s.db.Where("user_id = ?", userID)

	// Count total records
	var total int64
	if err := query.Model(&ExpenseType{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply pagination if specified
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	// Order by name
	query = query.Order("name ASC")

	var expenseTypes []ExpenseType
	if err := query.Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	return &ExpenseTypeListResponse{
		ExpenseTypes: expenseTypes,
		Total:        total,
	}, nil
}

// validateCreateExpenseTypeRequest validates the create expense type request
func (s *ExpenseTypeService) validateCreateExpenseTypeRequest(req CreateExpenseTypeRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return ErrEmptyExpenseTypeName
	}
	return nil
}

// validateUpdateExpenseTypeRequest validates the update expense type request
func (s *ExpenseTypeService) validateUpdateExpenseTypeRequest(req UpdateExpenseTypeRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return ErrEmptyExpenseTypeName
	}
	return nil
}
