package bills

import (
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

type BillTypeService struct {
	db *gorm.DB
}

type CreateBillTypeRequest struct {
	Name          string `json:"name" validate:"required,min=1"`
	Icon          string `json:"icon"`
	Color         string `json:"color"`
	BillDay       int    `json:"bill_day" validate:"min=0,max=31"`
	BillCycle     int    `json:"bill_cycle" validate:"min=0"`
	FixedAmount   string `json:"fixed_amount"`
	ExpenseTypeID *uint  `json:"expense_type_id"`
}

type UpdateBillTypeRequest struct {
	Name          string `json:"name" validate:"required,min=1"`
	Icon          string `json:"icon"`
	Color         string `json:"color"`
	BillDay       int    `json:"bill_day" validate:"min=0,max=31"`
	BillCycle     int    `json:"bill_cycle" validate:"min=0"`
	FixedAmount   string `json:"fixed_amount"`
	Stopped       bool   `json:"stopped"`
	ExpenseTypeID *uint  `json:"expense_type_id"`
}

type BillTypeListResponse struct {
	BillTypes []BillType `json:"bill_types"`
	Total     int64      `json:"total"`
}

var (
	ErrBillTypeNotFound   = errors.New("bill type not found")
	ErrBillTypeNameExists = errors.New("bill type name already exists")
	ErrEmptyBillTypeName  = errors.New("bill type name cannot be empty")
	ErrInvalidBillDay     = errors.New("bill day must be between 0 and 31")
	ErrInvalidBillCycle   = errors.New("bill cycle must be 0 or greater")
)

func NewBillTypeService(db *gorm.DB) *BillTypeService {
	return &BillTypeService{
		db: db,
	}
}

// CreateBillType creates a new bill type for a user
func (s *BillTypeService) CreateBillType(userID uint, req CreateBillTypeRequest) (*BillType, error) {
	// Validate input
	if err := s.validateCreateBillTypeRequest(req); err != nil {
		return nil, err
	}

	// Check if name already exists for this user
	var existingBillType BillType
	if err := s.db.Where("user_id = ? AND name = ?", userID, strings.TrimSpace(req.Name)).First(&existingBillType).Error; err == nil {
		return nil, ErrBillTypeNameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing bill type name: %w", err)
	}

	// Create bill type
	billType := BillType{
		Name:          strings.TrimSpace(req.Name),
		Icon:          strings.TrimSpace(req.Icon),
		Color:         strings.TrimSpace(req.Color),
		BillDay:       req.BillDay,
		BillCycle:     req.BillCycle,
		FixedAmount:   strings.TrimSpace(req.FixedAmount),
		Stopped:       false,
		ExpenseTypeID: req.ExpenseTypeID,
		UserID:        userID,
	}

	if err := s.db.Create(&billType).Error; err != nil {
		return nil, fmt.Errorf("failed to create bill type: %w", err)
	}

	return &billType, nil
}

// GetBillType returns a bill type by ID for a specific user
func (s *BillTypeService) GetBillType(userID uint, billTypeID uint) (*BillType, error) {
	var billType BillType
	if err := s.db.Where("id = ? AND user_id = ?", billTypeID, userID).First(&billType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBillTypeNotFound
		}
		return nil, fmt.Errorf("failed to get bill type: %w", err)
	}

	return &billType, nil
}

// UpdateBillType updates an existing bill type
func (s *BillTypeService) UpdateBillType(userID uint, billTypeID uint, req UpdateBillTypeRequest) (*BillType, error) {
	// Validate input
	if err := s.validateUpdateBillTypeRequest(req); err != nil {
		return nil, err
	}

	// Get existing bill type
	billType, err := s.GetBillType(userID, billTypeID)
	if err != nil {
		return nil, err
	}

	// Check if name already exists for this user (excluding current bill type)
	var existingBillType BillType
	if err := s.db.Where("user_id = ? AND name = ? AND id != ?", userID, strings.TrimSpace(req.Name), billTypeID).First(&existingBillType).Error; err == nil {
		return nil, ErrBillTypeNameExists
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing bill type name: %w", err)
	}

	// Update fields
	billType.Name = strings.TrimSpace(req.Name)
	billType.Icon = strings.TrimSpace(req.Icon)
	billType.Color = strings.TrimSpace(req.Color)
	billType.BillDay = req.BillDay
	billType.BillCycle = req.BillCycle
	billType.FixedAmount = strings.TrimSpace(req.FixedAmount)
	billType.Stopped = req.Stopped
	billType.ExpenseTypeID = req.ExpenseTypeID

	if err := s.db.Save(billType).Error; err != nil {
		return nil, fmt.Errorf("failed to update bill type: %w", err)
	}

	return billType, nil
}

// DeleteBillType deletes a bill type (soft delete)
func (s *BillTypeService) DeleteBillType(userID uint, billTypeID uint) error {
	// Get existing bill type to ensure it exists and belongs to user
	_, err := s.GetBillType(userID, billTypeID)
	if err != nil {
		return err
	}

	if err := s.db.Where("id = ? AND user_id = ?", billTypeID, userID).Delete(&BillType{}).Error; err != nil {
		return fmt.Errorf("failed to delete bill type: %w", err)
	}

	return nil
}

// ListBillTypes returns a paginated list of bill types for a user
func (s *BillTypeService) ListBillTypes(userID uint, limit, offset int, includesStopped bool) (*BillTypeListResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var billTypes []BillType
	var total int64

	query := s.db.Model(&BillType{}).Where("user_id = ?", userID)

	if !includesStopped {
		query = query.Where("stopped = ?", false)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count bill types: %w", err)
	}

	// Get bill types with pagination
	if err := query.Limit(limit).Offset(offset).Order("created_at DESC").Find(&billTypes).Error; err != nil {
		return nil, fmt.Errorf("failed to get bill types: %w", err)
	}

	return &BillTypeListResponse{
		BillTypes: billTypes,
		Total:     total,
	}, nil
}

// ToggleBillType toggles the stopped status of a bill type
func (s *BillTypeService) ToggleBillType(userID uint, billTypeID uint) (*BillType, error) {
	// Get existing bill type
	billType, err := s.GetBillType(userID, billTypeID)
	if err != nil {
		return nil, err
	}

	// Toggle stopped status
	billType.Stopped = !billType.Stopped

	if err := s.db.Save(billType).Error; err != nil {
		return nil, fmt.Errorf("failed to toggle bill type: %w", err)
	}

	return billType, nil
}

// validateCreateBillTypeRequest validates the create bill type request
func (s *BillTypeService) validateCreateBillTypeRequest(req CreateBillTypeRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return ErrEmptyBillTypeName
	}
	if req.BillDay < 0 || req.BillDay > 31 {
		return ErrInvalidBillDay
	}
	if req.BillCycle < 0 {
		return ErrInvalidBillCycle
	}
	return nil
}

// validateUpdateBillTypeRequest validates the update bill type request
func (s *BillTypeService) validateUpdateBillTypeRequest(req UpdateBillTypeRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return ErrEmptyBillTypeName
	}
	if req.BillDay < 0 || req.BillDay > 31 {
		return ErrInvalidBillDay
	}
	if req.BillCycle < 0 {
		return ErrInvalidBillCycle
	}
	return nil
}
