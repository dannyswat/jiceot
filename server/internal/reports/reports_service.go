package reports

import (
	"fmt"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type ReportsService struct {
	db *gorm.DB
}

type MonthlyReport struct {
	Year                 int                          `json:"year"`
	Month                int                          `json:"month"`
	TotalAmount          float64                      `json:"total_amount"`
	ExpenseAmount        float64                      `json:"expense_amount"`
	BillAmount           float64                      `json:"bill_amount"`
	UnexplainedPayment   float64                      `json:"unexplained_payment"`
	ExpenseTypeBreakdown map[string]TypeBreakdownItem `json:"expense_type_breakdown"`
	BillTypeBreakdown    map[string]TypeBreakdownItem `json:"bill_type_breakdown"`
}

type TypeBreakdownItem struct {
	Amount float64 `json:"amount"`
	Count  int     `json:"count"`
	Color  string  `json:"color"`
	Icon   string  `json:"icon"`
}

type YearlyReport struct {
	Year    int             `json:"year"`
	Months  []MonthlyReport `json:"months"`
	Summary YearlySummary   `json:"summary"`
}

type YearlySummary struct {
	TotalAmount        float64 `json:"total_amount"`
	TotalExpenseAmount float64 `json:"total_expense_amount"`
	TotalBillAmount    float64 `json:"total_bill_amount"`
	AverageMonthly     float64 `json:"average_monthly"`
}

func NewReportsService(db *gorm.DB) *ReportsService {
	return &ReportsService{db: db}
}

func (s *ReportsService) GetMonthlyReport(userID uint, year, month int) (*MonthlyReport, error) {
	var expenseTypes []expenses.ExpenseType
	if err := s.db.Where("user_id = ?", userID).Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ?", userID).Find(&billTypes).Error; err != nil {
		return nil, err
	}

	var expenseItems []expenses.ExpenseItem
	if err := s.db.Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		Find(&expenseItems).Error; err != nil {
		return nil, err
	}

	var billPayments []expenses.BillPayment
	if err := s.db.Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		Find(&billPayments).Error; err != nil {
		return nil, err
	}

	return s.processMonthlyData(year, month, expenseItems, billPayments, expenseTypes, billTypes), nil
}

func (s *ReportsService) GetYearlyReport(userID uint, year int) (*YearlyReport, error) {
	var expenseTypes []expenses.ExpenseType
	if err := s.db.Where("user_id = ?", userID).Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ?", userID).Find(&billTypes).Error; err != nil {
		return nil, err
	}

	var allExpenseItems []expenses.ExpenseItem
	if err := s.db.Where("user_id = ? AND year = ?", userID, year).Find(&allExpenseItems).Error; err != nil {
		return nil, err
	}

	var allBillPayments []expenses.BillPayment
	if err := s.db.Where("user_id = ? AND year = ?", userID, year).Find(&allBillPayments).Error; err != nil {
		return nil, err
	}

	var months []MonthlyReport
	var totalAmount, totalExpenseAmount, totalBillAmount float64

	for month := 1; month <= 12; month++ {
		var monthExpenseItems []expenses.ExpenseItem
		for _, item := range allExpenseItems {
			if item.Month == month {
				monthExpenseItems = append(monthExpenseItems, item)
			}
		}

		var monthBillPayments []expenses.BillPayment
		for _, payment := range allBillPayments {
			if payment.Month == month {
				monthBillPayments = append(monthBillPayments, payment)
			}
		}

		monthReport := s.processMonthlyData(year, month, monthExpenseItems, monthBillPayments, expenseTypes, billTypes)
		months = append(months, *monthReport)

		totalAmount += monthReport.TotalAmount
		totalExpenseAmount += monthReport.ExpenseAmount
		totalBillAmount += monthReport.BillAmount
	}

	return &YearlyReport{
		Year:   year,
		Months: months,
		Summary: YearlySummary{
			TotalAmount:        totalAmount,
			TotalExpenseAmount: totalExpenseAmount,
			TotalBillAmount:    totalBillAmount,
			AverageMonthly:     totalAmount / 12,
		},
	}, nil
}

func (s *ReportsService) processMonthlyData(
	year, month int,
	expenseItems []expenses.ExpenseItem,
	billPayments []expenses.BillPayment,
	expenseTypes []expenses.ExpenseType,
	billTypes []expenses.BillType,
) *MonthlyReport {
	expenseTypeBreakdown := make(map[string]TypeBreakdownItem)
	billTypeBreakdown := make(map[string]TypeBreakdownItem)

	expenseTypeMap := make(map[uint]expenses.ExpenseType)
	for _, et := range expenseTypes {
		expenseTypeMap[et.ID] = et
	}

	billTypeMap := make(map[uint]expenses.BillType)
	for _, bt := range billTypes {
		billTypeMap[bt.ID] = bt
	}

	paymentExpenseAmounts := make(map[uint]float64)

	var totalExpenseAmount float64
	for _, item := range expenseItems {
		amount, _ := parseAmount(item.Amount)

		if item.BillPaymentID != nil {
			paymentExpenseAmounts[*item.BillPaymentID] += amount
		} else {
			totalExpenseAmount += amount
		}

		expenseType, exists := expenseTypeMap[item.ExpenseTypeID]
		typeName := "Unknown"
		color := "#6B7280"
		icon := "💰"

		if exists {
			typeName = expenseType.Name
			color = expenseType.Color
			icon = expenseType.Icon
		}

		if _, ok := expenseTypeBreakdown[typeName]; !ok {
			expenseTypeBreakdown[typeName] = TypeBreakdownItem{
				Amount: 0,
				Count:  0,
				Color:  color,
				Icon:   icon,
			}
		}

		breakdown := expenseTypeBreakdown[typeName]
		breakdown.Amount += amount
		breakdown.Count++
		expenseTypeBreakdown[typeName] = breakdown
	}

	var totalBillAmount float64
	var unexplainedPayment float64
	for _, payment := range billPayments {
		amount, _ := parseAmount(payment.Amount)
		totalBillAmount += amount

		explainedAmount := paymentExpenseAmounts[payment.ID]
		if amount > explainedAmount {
			unexplainedPayment += amount - explainedAmount
		}

		billType, exists := billTypeMap[payment.BillTypeID]
		typeName := "Unknown"
		color := "#6B7280"
		icon := "💳"

		if exists {
			typeName = billType.Name
			color = billType.Color
			icon = billType.Icon
		}

		if _, ok := billTypeBreakdown[typeName]; !ok {
			billTypeBreakdown[typeName] = TypeBreakdownItem{
				Amount: 0,
				Count:  0,
				Color:  color,
				Icon:   icon,
			}
		}

		breakdown := billTypeBreakdown[typeName]
		breakdown.Amount += amount
		breakdown.Count++
		billTypeBreakdown[typeName] = breakdown
	}

	return &MonthlyReport{
		Year:                 year,
		Month:                month,
		TotalAmount:          totalExpenseAmount + totalBillAmount,
		ExpenseAmount:        totalExpenseAmount,
		BillAmount:           totalBillAmount,
		UnexplainedPayment:   unexplainedPayment,
		ExpenseTypeBreakdown: expenseTypeBreakdown,
		BillTypeBreakdown:    billTypeBreakdown,
	}
}

func parseAmount(amount string) (float64, error) {
	if amount == "" {
		return 0, nil
	}
	var result float64
	_, err := fmt.Sscanf(amount, "%f", &result)
	return result, err
}
