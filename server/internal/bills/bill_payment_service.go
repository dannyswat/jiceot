package bills

import (
	"errors"
	"math/big"
	"time"

	"gorm.io/gorm"
)

var (
	ErrBillPaymentNotFound      = errors.New("bill payment not found")
	ErrInvalidBillPaymentAmount = errors.New("invalid bill payment amount")
	ErrInvalidBillPaymentMonth  = errors.New("invalid month: must be between 1 and 12")
	ErrInvalidBillPaymentYear   = errors.New("invalid year: must be between 2000 and 2100")
	ErrBillPaymentExists        = errors.New("bill payment already exists for this month")
)

type BillPaymentService struct {
	db *gorm.DB
}

type CreateBillPaymentRequest struct {
	BillTypeID uint   `json:"bill_type_id" validate:"required"`
	Year       int    `json:"year" validate:"required,min=2000,max=2100"`
	Month      int    `json:"month" validate:"required,min=1,max=12"`
	Amount     string `json:"amount" validate:"required"`
	Note       string `json:"note"`
}

type UpdateBillPaymentRequest struct {
	Amount string `json:"amount" validate:"required"`
	Note   string `json:"note"`
}

type BillPaymentListRequest struct {
	BillTypeID *uint `json:"bill_type_id"`
	Year       *int  `json:"year"`
	Month      *int  `json:"month"`
	Limit      int   `json:"limit"`
	Offset     int   `json:"offset"`
}

type BillPaymentListResponse struct {
	BillPayments []BillPayment `json:"bill_payments"`
	Total        int64         `json:"total"`
}

func NewBillPaymentService(db *gorm.DB) *BillPaymentService {
	return &BillPaymentService{db: db}
}

// CreateBillPayment creates a new bill payment
func (s *BillPaymentService) CreateBillPayment(userID uint, req CreateBillPaymentRequest) (*BillPayment, error) {
	if err := s.validateCreateBillPaymentRequest(req); err != nil {
		return nil, err
	}

	// Check if bill type exists and belongs to user
	var billType BillType
	if err := s.db.Where("id = ? AND user_id = ?", req.BillTypeID, userID).First(&billType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBillTypeNotFound
		}
		return nil, err
	}

	// Check if payment already exists for this bill type and month
	var existingPayment BillPayment
	err := s.db.Where("bill_type_id = ? AND year = ? AND month = ? AND user_id = ?",
		req.BillTypeID, req.Year, req.Month, userID).First(&existingPayment).Error
	if err == nil {
		return nil, ErrBillPaymentExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Validate amount
	amount := new(big.Float)
	if _, ok := amount.SetString(req.Amount); !ok {
		return nil, ErrInvalidBillPaymentAmount
	}

	billPayment := BillPayment{
		BillTypeID: req.BillTypeID,
		Year:       req.Year,
		Month:      req.Month,
		Amount:     req.Amount,
		Note:       req.Note,
		UserID:     userID,
	}

	if err := s.db.Create(&billPayment).Error; err != nil {
		return nil, err
	}

	// Load the bill type association
	if err := s.db.Preload("BillType").First(&billPayment, billPayment.ID).Error; err != nil {
		return nil, err
	}

	return &billPayment, nil
}

// GetBillPayment retrieves a bill payment by ID
func (s *BillPaymentService) GetBillPayment(userID, billPaymentID uint) (*BillPayment, error) {
	var billPayment BillPayment
	err := s.db.Preload("BillType").Where("id = ? AND user_id = ?", billPaymentID, userID).First(&billPayment).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBillPaymentNotFound
		}
		return nil, err
	}
	return &billPayment, nil
}

// UpdateBillPayment updates an existing bill payment
func (s *BillPaymentService) UpdateBillPayment(userID, billPaymentID uint, req UpdateBillPaymentRequest) (*BillPayment, error) {
	if err := s.validateUpdateBillPaymentRequest(req); err != nil {
		return nil, err
	}

	var billPayment BillPayment
	err := s.db.Where("id = ? AND user_id = ?", billPaymentID, userID).First(&billPayment).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBillPaymentNotFound
		}
		return nil, err
	}

	// Validate amount
	amount := new(big.Float)
	if _, ok := amount.SetString(req.Amount); !ok {
		return nil, ErrInvalidBillPaymentAmount
	}

	billPayment.Amount = req.Amount
	billPayment.Note = req.Note
	billPayment.UpdatedAt = time.Now()

	if err := s.db.Save(&billPayment).Error; err != nil {
		return nil, err
	}

	// Load the bill type association
	if err := s.db.Preload("BillType").First(&billPayment, billPayment.ID).Error; err != nil {
		return nil, err
	}

	return &billPayment, nil
}

// DeleteBillPayment deletes a bill payment
func (s *BillPaymentService) DeleteBillPayment(userID, billPaymentID uint) error {
	result := s.db.Where("id = ? AND user_id = ?", billPaymentID, userID).Delete(&BillPayment{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrBillPaymentNotFound
	}
	return nil
}

// ListBillPayments retrieves bill payments with optional filtering
func (s *BillPaymentService) ListBillPayments(userID uint, req BillPaymentListRequest) (*BillPaymentListResponse, error) {
	query := s.db.Where("user_id = ?", userID).Preload("BillType")

	// Apply filters
	if req.BillTypeID != nil {
		query = query.Where("bill_type_id = ?", *req.BillTypeID)
	}
	if req.Year != nil {
		query = query.Where("year = ?", *req.Year)
	}
	if req.Month != nil {
		query = query.Where("month = ?", *req.Month)
	}

	// Count total records
	var total int64
	if err := query.Model(&BillPayment{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply pagination
	if req.Limit > 0 {
		query = query.Limit(req.Limit)
	}
	if req.Offset > 0 {
		query = query.Offset(req.Offset)
	}

	// Order by year and month descending (most recent first)
	query = query.Order("year DESC, month DESC")

	var billPayments []BillPayment
	if err := query.Find(&billPayments).Error; err != nil {
		return nil, err
	}

	return &BillPaymentListResponse{
		BillPayments: billPayments,
		Total:        total,
	}, nil
}

// GetBillPaymentsByBillType retrieves all payments for a specific bill type
func (s *BillPaymentService) GetBillPaymentsByBillType(userID, billTypeID uint) ([]BillPayment, error) {
	var billPayments []BillPayment
	err := s.db.Where("user_id = ? AND bill_type_id = ?", userID, billTypeID).
		Order("year DESC, month DESC").
		Find(&billPayments).Error
	if err != nil {
		return nil, err
	}
	return billPayments, nil
}

// GetMonthlyTotal calculates total bill payments for a specific month/year
func (s *BillPaymentService) GetMonthlyTotal(userID uint, year, month int) (*big.Float, error) {
	var payments []BillPayment
	err := s.db.Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		Find(&payments).Error
	if err != nil {
		return nil, err
	}

	total := new(big.Float)
	for _, payment := range payments {
		amount := payment.GetAmountAsBigFloat()
		total.Add(total, amount)
	}

	return total, nil
}

// validateCreateBillPaymentRequest validates the create bill payment request
func (s *BillPaymentService) validateCreateBillPaymentRequest(req CreateBillPaymentRequest) error {
	if req.BillTypeID == 0 {
		return ErrBillTypeNotFound
	}
	if req.Year < 2000 || req.Year > 2100 {
		return ErrInvalidBillPaymentYear
	}
	if req.Month < 1 || req.Month > 12 {
		return ErrInvalidBillPaymentMonth
	}
	if req.Amount == "" {
		return ErrInvalidBillPaymentAmount
	}

	// Validate amount format
	amount := new(big.Float)
	if _, ok := amount.SetString(req.Amount); !ok {
		return ErrInvalidBillPaymentAmount
	}

	// Check if amount is positive
	zero := new(big.Float)
	if amount.Cmp(zero) <= 0 {
		return ErrInvalidBillPaymentAmount
	}

	return nil
}

// validateUpdateBillPaymentRequest validates the update bill payment request
func (s *BillPaymentService) validateUpdateBillPaymentRequest(req UpdateBillPaymentRequest) error {
	if req.Amount == "" {
		return ErrInvalidBillPaymentAmount
	}

	// Validate amount format
	amount := new(big.Float)
	if _, ok := amount.SetString(req.Amount); !ok {
		return ErrInvalidBillPaymentAmount
	}

	// Check if amount is positive
	zero := new(big.Float)
	if amount.Cmp(zero) <= 0 {
		return ErrInvalidBillPaymentAmount
	}

	return nil
}
