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
	Year                 int                            `json:"year"`
	Month                int                            `json:"month"`
	From                 string                         `json:"from"`
	To                   string                         `json:"to"`
	TotalExpenses        float64                        `json:"total_expenses"`
	TotalPayments        float64                        `json:"total_payments"`
	ExpenseTypeBreakdown map[string]TypeBreakdownItem   `json:"expense_type_breakdown"`
	ParentTypeBreakdown  map[string]TypeBreakdownItem   `json:"parent_type_breakdown"`
	WalletBreakdown      map[string]WalletBreakdownItem `json:"wallet_breakdown"`
}

type TypeBreakdownItem struct {
	Amount float64 `json:"amount"`
	Count  int     `json:"count"`
	Color  string  `json:"color"`
	Icon   string  `json:"icon"`
}

type WalletBreakdownItem struct {
	Amount   float64 `json:"amount"`
	Count    int     `json:"count"`
	Color    string  `json:"color"`
	Icon     string  `json:"icon"`
	IsCredit bool    `json:"is_credit"`
	IsCash   bool    `json:"is_cash"`
}

type YearlyReport struct {
	Year    int             `json:"year"`
	Months  []MonthlyReport `json:"months"`
	Summary YearlySummary   `json:"summary"`
}

type YearlySummary struct {
	TotalExpenses          float64 `json:"total_expenses"`
	TotalPayments          float64 `json:"total_payments"`
	AverageMonthlyExpenses float64 `json:"average_monthly_expenses"`
	AverageMonthlyPayments float64 `json:"average_monthly_payments"`
}

func NewReportsService(db *gorm.DB) *ReportsService {
	return &ReportsService{db: db}
}

func (s *ReportsService) GetMonthlyReport(userID uint, year, month int) (*MonthlyReport, error) {
	return s.buildMonthlyReport(userID, year, month)
}

func (s *ReportsService) GetYearlyReport(userID uint, year int) (*YearlyReport, error) {
	var months []MonthlyReport
	var totalExpenses, totalPayments float64

	for month := 1; month <= 12; month++ {
		monthReport, err := s.buildMonthlyReport(userID, year, month)
		if err != nil {
			return nil, err
		}
		months = append(months, *monthReport)
		totalExpenses += monthReport.TotalExpenses
		totalPayments += monthReport.TotalPayments
	}

	return &YearlyReport{
		Year:   year,
		Months: months,
		Summary: YearlySummary{
			TotalExpenses:          totalExpenses,
			TotalPayments:          totalPayments,
			AverageMonthlyExpenses: totalExpenses / 12,
			AverageMonthlyPayments: totalPayments / 12,
		},
	}, nil
}

func (s *ReportsService) buildMonthlyReport(userID uint, year, month int) (*MonthlyReport, error) {
	from := expenses.BeginningOfMonth(year, month)
	to := expenses.EndOfMonth(year, month)

	var monthlyExpenses []expenses.Expense
	if err := s.db.Preload("ExpenseType.Parent").Where("user_id = ? AND date >= ? AND date <= ?", userID, from, to).Find(&monthlyExpenses).Error; err != nil {
		return nil, err
	}

	var monthlyPayments []expenses.Payment
	if err := s.db.Preload("Wallet").Where("user_id = ? AND date >= ? AND date <= ?", userID, from, to).Find(&monthlyPayments).Error; err != nil {
		return nil, err
	}

	expenseTypeBreakdown := make(map[string]TypeBreakdownItem)
	parentTypeBreakdown := make(map[string]TypeBreakdownItem)
	walletBreakdown := make(map[string]WalletBreakdownItem)

	var totalExpenses float64
	for _, expense := range monthlyExpenses {
		totalExpenses += expense.Amount
		typeName := "Unknown"
		color := "#6B7280"
		icon := ""
		parentName := typeName
		parentColor := color
		parentIcon := icon
		if expense.ExpenseType.ID != 0 {
			typeName = expense.ExpenseType.Name
			color = expense.ExpenseType.Color
			icon = expense.ExpenseType.Icon
			parentName = expense.ExpenseType.Name
			parentColor = expense.ExpenseType.Color
			parentIcon = expense.ExpenseType.Icon
			if expense.ExpenseType.Parent != nil {
				parentName = expense.ExpenseType.Parent.Name
				parentColor = expense.ExpenseType.Parent.Color
				parentIcon = expense.ExpenseType.Parent.Icon
			}
		}
		child := expenseTypeBreakdown[typeName]
		child.Amount += expense.Amount
		child.Count++
		child.Color = color
		child.Icon = icon
		expenseTypeBreakdown[typeName] = child

		parent := parentTypeBreakdown[parentName]
		parent.Amount += expense.Amount
		parent.Count++
		parent.Color = parentColor
		parent.Icon = parentIcon
		parentTypeBreakdown[parentName] = parent
	}

	var totalPayments float64
	for _, payment := range monthlyPayments {
		totalPayments += payment.Amount
		walletName := "Unknown"
		color := "#6B7280"
		icon := ""
		isCredit := false
		isCash := false
		if payment.Wallet.ID != 0 {
			walletName = payment.Wallet.Name
			color = payment.Wallet.Color
			icon = payment.Wallet.Icon
			isCredit = payment.Wallet.IsCredit
			isCash = payment.Wallet.IsCash
		}
		walletItem := walletBreakdown[walletName]
		walletItem.Amount += payment.Amount
		walletItem.Count++
		walletItem.Color = color
		walletItem.Icon = icon
		walletItem.IsCredit = isCredit
		walletItem.IsCash = isCash
		walletBreakdown[walletName] = walletItem
	}

	return &MonthlyReport{
		Year:                 year,
		Month:                month,
		From:                 from.Format(expenses.DateOnlyLayout),
		To:                   to.Format(expenses.DateOnlyLayout),
		TotalExpenses:        totalExpenses,
		TotalPayments:        totalPayments,
		ExpenseTypeBreakdown: expenseTypeBreakdown,
		ParentTypeBreakdown:  parentTypeBreakdown,
		WalletBreakdown:      walletBreakdown,
	}, nil
}

func parseAmount(amount string) (float64, error) {
	if amount == "" {
		return 0, nil
	}
	var result float64
	_, err := fmt.Sscanf(amount, "%f", &result)
	return result, err
}
