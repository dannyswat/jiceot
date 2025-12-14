package dashboard

import (
	"fmt"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type DashboardService struct {
	db *gorm.DB
}

type DashboardStats struct {
	TotalExpenses    float64           `json:"total_expenses"`
	BillsPaid        int               `json:"bills_paid"`
	PendingBills     int               `json:"pending_bills"`
	PendingExpenses  int               `json:"pending_expenses"`
	Categories       int               `json:"categories"`
	UpcomingBills    []UpcomingBill    `json:"upcoming_bills"`
	UpcomingExpenses []UpcomingExpense `json:"upcoming_expenses"`
	OnDemandBills    []BillTypeInfo    `json:"on_demand_bills"`
}

type UpcomingBill struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Icon         string `json:"icon"`
	Color        string `json:"color"`
	FixedAmount  string `json:"fixed_amount"`
	NextDueDate  string `json:"next_due_date"`
	DaysUntilDue int    `json:"days_until_due"`
}

type UpcomingExpense struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Icon         string `json:"icon"`
	Color        string `json:"color"`
	FixedAmount  string `json:"fixed_amount"`
	NextDueDate  string `json:"next_due_date"`
	DaysUntilDue int    `json:"days_until_due"`
}

type BillTypeInfo struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
	FixedAmount string `json:"fixed_amount"`
}

type DueBill struct {
	ID                uint    `json:"id"`
	Name              string  `json:"name"`
	Icon              string  `json:"icon"`
	Color             string  `json:"color"`
	FixedAmount       string  `json:"fixed_amount"`
	BillDay           int     `json:"bill_day"`
	BillCycle         int     `json:"bill_cycle"`
	NextDueDate       string  `json:"next_due_date"`
	DaysUntilDue      int     `json:"days_until_due"`
	Status            string  `json:"status"` // "overdue", "due_soon", "upcoming"
	HasCurrentPayment bool    `json:"has_current_payment"`
	LastPaymentYear   *int    `json:"last_payment_year,omitempty"`
	LastPaymentMonth  *int    `json:"last_payment_month,omitempty"`
	LastPaymentAmount *string `json:"last_payment_amount,omitempty"`
}

type DueBillsResponse struct {
	DueBills []DueBill `json:"due_bills"`
	Year     int       `json:"year"`
	Month    int       `json:"month"`
}

type DueExpense struct {
	ID                uint    `json:"id"`
	Name              string  `json:"name"`
	Icon              string  `json:"icon"`
	Color             string  `json:"color"`
	FixedAmount       string  `json:"fixed_amount"`
	BillDay           int     `json:"bill_day"`
	BillCycle         int     `json:"bill_cycle"`
	NextDueDate       string  `json:"next_due_date"`
	DaysUntilDue      int     `json:"days_until_due"`
	Status            string  `json:"status"` // "overdue", "due_soon", "upcoming"
	HasCurrentExpense bool    `json:"has_current_expense"`
	LastExpenseYear   *int    `json:"last_expense_year,omitempty"`
	LastExpenseMonth  *int    `json:"last_expense_month,omitempty"`
	LastExpenseAmount *string `json:"last_expense_amount,omitempty"`
}

type DueExpensesResponse struct {
	DueExpenses []DueExpense `json:"due_expenses"`
	Year        int          `json:"year"`
	Month       int          `json:"month"`
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{db: db}
}

// GetDashboardStats returns dashboard statistics for the current month
func (s *DashboardService) GetDashboardStats(userID uint) (*DashboardStats, error) {
	now := time.Now()
	currentYear := now.Year()
	currentMonth := int(now.Month())

	// Get current month bill payments
	var billPayments []expenses.BillPayment
	if err := s.db.Where("user_id = ? AND year = ? AND month = ?", userID, currentYear, currentMonth).
		Find(&billPayments).Error; err != nil {
		return nil, err
	}

	// Get current month expense items (excluding those linked to bill payments)
	var expenseItems []expenses.ExpenseItem
	if err := s.db.Where("user_id = ? AND year = ? AND month = ? AND bill_payment_id IS NULL", userID, currentYear, currentMonth).
		Find(&expenseItems).Error; err != nil {
		return nil, err
	}

	// Get all bill types for upcoming bills calculation
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ?", userID).Find(&billTypes).Error; err != nil {
		return nil, err
	}

	// Get all bill payments for due date calculation
	var allPayments []expenses.BillPayment
	if err := s.db.Where("user_id = ?", userID).Find(&allPayments).Error; err != nil {
		return nil, err
	}

	// Get all expense types for upcoming expenses calculation
	var expenseTypes []expenses.ExpenseType
	if err := s.db.Where("user_id = ?", userID).Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	// Get all expense items for due date calculation
	var allExpenseItems []expenses.ExpenseItem
	if err := s.db.Where("user_id = ?", userID).Find(&allExpenseItems).Error; err != nil {
		return nil, err
	}

	// Get expense types count
	var categoryCount int64
	if err := s.db.Model(&expenses.ExpenseType{}).Where("user_id = ?", userID).Count(&categoryCount).Error; err != nil {
		return nil, err
	}

	// Calculate totals
	var totalExpenseAmount float64
	for _, item := range expenseItems {
		amount, _ := parseAmount(item.Amount)
		totalExpenseAmount += amount
	}

	var totalBillAmount float64
	for _, payment := range billPayments {
		amount, _ := parseAmount(payment.Amount)
		totalBillAmount += amount
	}

	// Get upcoming bills
	upcomingBills := s.calculateUpcomingBills(billTypes, allPayments, currentYear, currentMonth)

	// Get upcoming expenses
	upcomingExpenses := s.calculateUpcomingExpenses(expenseTypes, allExpenseItems, currentYear, currentMonth)

	// Get on-demand bills
	var onDemandBills []BillTypeInfo
	for _, bt := range billTypes {
		if bt.BillCycle == 0 && !bt.Stopped {
			onDemandBills = append(onDemandBills, BillTypeInfo{
				ID:          bt.ID,
				Name:        bt.Name,
				Icon:        bt.Icon,
				Color:       bt.Color,
				FixedAmount: bt.FixedAmount,
			})
		}
	}

	return &DashboardStats{
		TotalExpenses:    totalExpenseAmount + totalBillAmount,
		BillsPaid:        len(billPayments),
		PendingBills:     len(upcomingBills),
		PendingExpenses:  len(upcomingExpenses),
		Categories:       int(categoryCount),
		UpcomingBills:    upcomingBills,
		UpcomingExpenses: upcomingExpenses,
		OnDemandBills:    onDemandBills,
	}, nil
}

func (s *DashboardService) calculateUpcomingBills(billTypes []expenses.BillType, allPayments []expenses.BillPayment, currentYear int, currentMonth int) []UpcomingBill {
	now := time.Now()
	upcomingBills := make([]UpcomingBill, 0)

	for _, bt := range billTypes {
		if bt.Stopped || bt.BillCycle <= 0 {
			continue
		}

		// Find last payment for this bill type
		var lastPayment *expenses.BillPayment
		for i := range allPayments {
			if allPayments[i].BillTypeID == bt.ID {
				if lastPayment == nil || (allPayments[i].Year*12+allPayments[i].Month > lastPayment.Year*12+lastPayment.Month) {
					lastPayment = &allPayments[i]
				}
			}
		}

		// Calculate next due date
		nextDueDate := CalculateNextDueDateFromLastPayment(bt, lastPayment, currentYear, currentMonth)
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)

		// Check for current month payment
		hasCurrentPayment := false
		for _, p := range allPayments {
			if p.BillTypeID == bt.ID && p.Year == currentYear && p.Month == currentMonth {
				hasCurrentPayment = true
				break
			}
		}

		// Determine if bill is due in or before the current month
		nextDueDateMonth := int(nextDueDate.Month())
		nextDueDateYear := nextDueDate.Year()

		// Convert to comparable format (year*12 + month)
		currentPeriod := currentYear*12 + currentMonth
		nextDuePeriod := nextDueDateYear*12 + nextDueDateMonth

		// Bill is due if the next due date is in or before the current month
		isDueInOrBeforeCurrentMonth := nextDuePeriod <= currentPeriod

		// isPaid means either:
		// 1. There's already a payment for the current month, OR
		// 2. The next due date is after the current month (not due yet)
		isPaid := hasCurrentPayment || !isDueInOrBeforeCurrentMonth

		// Show bills that are not paid and have upcoming due dates (not overdue)
		if !isPaid && daysUntilDue >= 0 {
			upcomingBills = append(upcomingBills, UpcomingBill{
				ID:           bt.ID,
				Name:         bt.Name,
				Icon:         bt.Icon,
				Color:        bt.Color,
				FixedAmount:  bt.FixedAmount,
				NextDueDate:  nextDueDate.Format("2006-01-02"),
				DaysUntilDue: daysUntilDue,
			})
		}
	}

	// Sort by days until due and limit to 5
	sortUpcomingBills(upcomingBills)
	if len(upcomingBills) > 5 {
		upcomingBills = upcomingBills[:5]
	}

	return upcomingBills
}

// CalculateNextDueDateFromLastPayment calculates the next due date based on last payment and bill cycle
// This is exported so it can be reused by other services
func CalculateNextDueDateFromLastPayment(billType expenses.BillType, lastPayment *expenses.BillPayment, currentYear int, currentMonth int) time.Time {
	if lastPayment == nil {
		if billType.BillDay == 0 {
			// No specific day, use end of month
			return time.Date(currentYear, time.Month(currentMonth+1), 0, 0, 0, 0, 0, time.Local)
		}
		return time.Date(currentYear, time.Month(currentMonth), billType.BillDay, 0, 0, 0, 0, time.Local)
	}

	// Calculate next due date based on last payment + bill cycle
	nextDueYear := lastPayment.Year
	nextDueMonth := lastPayment.Month + billType.BillCycle

	// Handle year overflow
	for nextDueMonth > 12 {
		nextDueYear++
		nextDueMonth -= 12
	}

	if billType.BillDay == 0 {
		// No specific day, use end of month
		return time.Date(nextDueYear, time.Month(nextDueMonth+1), 0, 0, 0, 0, 0, time.Local)
	}

	return time.Date(nextDueYear, time.Month(nextDueMonth), billType.BillDay, 0, 0, 0, 0, time.Local)
}

func sortUpcomingBills(bills []UpcomingBill) {
	// Simple bubble sort for small arrays
	for i := 0; i < len(bills)-1; i++ {
		for j := 0; j < len(bills)-i-1; j++ {
			if bills[j].DaysUntilDue > bills[j+1].DaysUntilDue {
				bills[j], bills[j+1] = bills[j+1], bills[j]
			}
		}
	}
}

func (s *DashboardService) calculateUpcomingExpenses(expenseTypes []expenses.ExpenseType, allExpenseItems []expenses.ExpenseItem, currentYear int, currentMonth int) []UpcomingExpense {
	now := time.Now()
	upcomingExpenses := make([]UpcomingExpense, 0)

	for _, et := range expenseTypes {
		if et.BillCycle <= 0 {
			continue
		}

		// Find last expense for this expense type
		var lastExpense *expenses.ExpenseItem
		for i := range allExpenseItems {
			if allExpenseItems[i].ExpenseTypeID == et.ID {
				if lastExpense == nil || (allExpenseItems[i].Year*12+allExpenseItems[i].Month > lastExpense.Year*12+lastExpense.Month) {
					lastExpense = &allExpenseItems[i]
				}
			}
		}

		// Calculate next due date
		nextDueDate := calculateNextExpenseDueDateFromLastExpense(et, lastExpense, currentYear, currentMonth)
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)

		// Check for current month expense
		hasCurrentExpense := false
		for _, e := range allExpenseItems {
			if e.ExpenseTypeID == et.ID && e.Year == currentYear && e.Month == currentMonth {
				hasCurrentExpense = true
				break
			}
		}

		// Determine if expense is due in or before the current month
		nextDueDateMonth := int(nextDueDate.Month())
		nextDueDateYear := nextDueDate.Year()

		// Convert to comparable format (year*12 + month)
		currentPeriod := currentYear*12 + currentMonth
		nextDuePeriod := nextDueDateYear*12 + nextDueDateMonth

		// Expense is due if the next due date is in or before the current month
		isDueInOrBeforeCurrentMonth := nextDuePeriod <= currentPeriod

		// isCreated means either:
		// 1. There's already an expense for the current month, OR
		// 2. The next due date is after the current month (not due yet)
		isCreated := hasCurrentExpense || !isDueInOrBeforeCurrentMonth

		// Show expenses that are not created and have upcoming due dates (not overdue)
		if !isCreated && daysUntilDue >= 0 {
			upcomingExpenses = append(upcomingExpenses, UpcomingExpense{
				ID:           et.ID,
				Name:         et.Name,
				Icon:         et.Icon,
				Color:        et.Color,
				FixedAmount:  et.FixedAmount,
				NextDueDate:  nextDueDate.Format("2006-01-02"),
				DaysUntilDue: daysUntilDue,
			})
		}
	}

	// Sort by days until due and limit to 5
	sortUpcomingExpenses(upcomingExpenses)
	if len(upcomingExpenses) > 5 {
		upcomingExpenses = upcomingExpenses[:5]
	}

	return upcomingExpenses
}

func calculateNextExpenseDueDateFromLastExpense(expenseType expenses.ExpenseType, lastExpense *expenses.ExpenseItem, currentYear int, currentMonth int) time.Time {
	if lastExpense == nil {
		if expenseType.BillDay == 0 {
			// No specific day, use end of month
			return time.Date(currentYear, time.Month(currentMonth+1), 0, 0, 0, 0, 0, time.Local)
		}
		return time.Date(currentYear, time.Month(currentMonth), expenseType.BillDay, 0, 0, 0, 0, time.Local)
	}

	// Add the cycle to the last expense date
	nextDueYear := lastExpense.Year
	nextDueMonth := lastExpense.Month + expenseType.BillCycle

	// Handle month overflow
	for nextDueMonth > 12 {
		nextDueMonth -= 12
		nextDueYear++
	}

	if expenseType.BillDay == 0 {
		// No specific day, use end of month
		return time.Date(nextDueYear, time.Month(nextDueMonth+1), 0, 0, 0, 0, 0, time.Local)
	}

	return time.Date(nextDueYear, time.Month(nextDueMonth), expenseType.BillDay, 0, 0, 0, 0, time.Local)
}

func sortUpcomingExpenses(expenses []UpcomingExpense) {
	// Simple bubble sort for small arrays
	for i := 0; i < len(expenses)-1; i++ {
		for j := 0; j < len(expenses)-i-1; j++ {
			if expenses[j].DaysUntilDue > expenses[j+1].DaysUntilDue {
				expenses[j], expenses[j+1] = expenses[j+1], expenses[j]
			}
		}
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

// GetDueBills returns all due bills for a specific month
func (s *DashboardService) GetDueBills(userID uint, year, month int) (*DueBillsResponse, error) {
	now := time.Now()

	// Get all bill types
	var billTypes []expenses.BillType
	if err := s.db.Where("user_id = ?", userID).Find(&billTypes).Error; err != nil {
		return nil, err
	}

	// Get all bill payments
	var allPayments []expenses.BillPayment
	if err := s.db.Where("user_id = ?", userID).Find(&allPayments).Error; err != nil {
		return nil, err
	}

	dueBills := make([]DueBill, 0)

	for _, bt := range billTypes {
		if bt.Stopped || bt.BillCycle <= 0 {
			continue
		}

		// Find last payment for this bill type
		var lastPayment *expenses.BillPayment
		for i := range allPayments {
			if allPayments[i].BillTypeID == bt.ID {
				if lastPayment == nil || (allPayments[i].Year*12+allPayments[i].Month > lastPayment.Year*12+lastPayment.Month) {
					lastPayment = &allPayments[i]
				}
			}
		}

		// Calculate next due date
		nextDueDate := CalculateNextDueDateFromLastPayment(bt, lastPayment, year, month)
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)

		// Check for current month payment
		hasCurrentPayment := false
		for _, p := range allPayments {
			if p.BillTypeID == bt.ID && p.Year == year && p.Month == month {
				hasCurrentPayment = true
				break
			}
		}

		// Determine if bill is due in or before the selected month
		nextDueDateMonth := int(nextDueDate.Month())
		nextDueDateYear := nextDueDate.Year()

		// Convert to comparable format (year*12 + month)
		selectedPeriod := year*12 + month
		nextDuePeriod := nextDueDateYear*12 + nextDueDateMonth

		// Bill is due if the next due date is in or before the selected month
		isDueInOrBeforeSelectedMonth := nextDuePeriod <= selectedPeriod

		// isPaid means either:
		// 1. There's already a payment for the selected month, OR
		// 2. The next due date is after the selected month (not due yet)
		isPaid := hasCurrentPayment || !isDueInOrBeforeSelectedMonth

		// Determine status
		var status string
		if hasCurrentPayment {
			// Actually paid for this month
			status = "upcoming"
		} else if !isDueInOrBeforeSelectedMonth {
			// Not due yet in this month
			status = "upcoming"
		} else if daysUntilDue < 0 {
			status = "overdue"
		} else if daysUntilDue <= 7 {
			status = "due_soon"
		} else {
			status = "upcoming"
		}

		dueBill := DueBill{
			ID:                bt.ID,
			Name:              bt.Name,
			Icon:              bt.Icon,
			Color:             bt.Color,
			FixedAmount:       bt.FixedAmount,
			BillDay:           bt.BillDay,
			BillCycle:         bt.BillCycle,
			NextDueDate:       nextDueDate.Format("2006-01-02"),
			DaysUntilDue:      daysUntilDue,
			Status:            status,
			HasCurrentPayment: isPaid,
		}

		if lastPayment != nil {
			dueBill.LastPaymentYear = &lastPayment.Year
			dueBill.LastPaymentMonth = &lastPayment.Month
			dueBill.LastPaymentAmount = &lastPayment.Amount
		}

		dueBills = append(dueBills, dueBill)
	}

	// Sort by priority: overdue first, then due soon, then by due date
	sortDueBills(dueBills)

	return &DueBillsResponse{
		DueBills: dueBills,
		Year:     year,
		Month:    month,
	}, nil
}

func sortDueBills(bills []DueBill) {
	statusPriority := map[string]int{"overdue": 0, "due_soon": 1, "upcoming": 2}
	for i := 0; i < len(bills)-1; i++ {
		for j := 0; j < len(bills)-i-1; j++ {
			if statusPriority[bills[j].Status] > statusPriority[bills[j+1].Status] ||
				(statusPriority[bills[j].Status] == statusPriority[bills[j+1].Status] &&
					bills[j].DaysUntilDue > bills[j+1].DaysUntilDue) {
				bills[j], bills[j+1] = bills[j+1], bills[j]
			}
		}
	}
}

// GetDueExpenses returns all due expenses for a specific month
func (s *DashboardService) GetDueExpenses(userID uint, year, month int) (*DueExpensesResponse, error) {
	now := time.Now()

	// Get all expense types with recurring settings
	var expenseTypes []expenses.ExpenseType
	if err := s.db.Where("user_id = ? AND bill_cycle > 0", userID).Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	// Get all expense items
	var allExpenses []expenses.ExpenseItem
	if err := s.db.Where("user_id = ?", userID).Find(&allExpenses).Error; err != nil {
		return nil, err
	}

	dueExpenses := make([]DueExpense, 0)

	for _, et := range expenseTypes {
		if et.BillCycle <= 0 {
			continue
		}

		// Find last expense for this expense type
		var lastExpense *expenses.ExpenseItem
		for i := range allExpenses {
			if allExpenses[i].ExpenseTypeID == et.ID {
				if lastExpense == nil || (allExpenses[i].Year*12+allExpenses[i].Month > lastExpense.Year*12+lastExpense.Month) {
					lastExpense = &allExpenses[i]
				}
			}
		}

		// Calculate next due date (similar to bill types)
		nextDueDate := calculateNextDueDate(et.BillDay, et.BillCycle, lastExpense, year, month)
		daysUntilDue := int(nextDueDate.Sub(now).Hours() / 24)

		// Check for current month expense
		hasCurrentExpense := false
		for _, e := range allExpenses {
			if e.ExpenseTypeID == et.ID && e.Year == year && e.Month == month {
				hasCurrentExpense = true
				break
			}
		}

		// Determine if expense is due in or before the selected month
		nextDueDateMonth := int(nextDueDate.Month())
		nextDueDateYear := nextDueDate.Year()

		// Convert to comparable format (year*12 + month)
		selectedPeriod := year*12 + month
		nextDuePeriod := nextDueDateYear*12 + nextDueDateMonth

		// Expense is due if the next due date is in or before the selected month
		isDueInOrBeforeSelectedMonth := nextDuePeriod <= selectedPeriod

		// isCreated means either:
		// 1. There's already an expense for the selected month, OR
		// 2. The next due date is after the selected month (not due yet)
		isCreated := hasCurrentExpense || !isDueInOrBeforeSelectedMonth

		// Determine status
		var status string
		if hasCurrentExpense {
			status = "upcoming"
		} else if !isDueInOrBeforeSelectedMonth {
			status = "upcoming"
		} else if daysUntilDue < 0 {
			status = "overdue"
		} else if daysUntilDue <= 7 {
			status = "due_soon"
		} else {
			status = "upcoming"
		}

		dueExpense := DueExpense{
			ID:                et.ID,
			Name:              et.Name,
			Icon:              et.Icon,
			Color:             et.Color,
			FixedAmount:       et.FixedAmount,
			BillDay:           et.BillDay,
			BillCycle:         et.BillCycle,
			NextDueDate:       nextDueDate.Format("2006-01-02"),
			DaysUntilDue:      daysUntilDue,
			Status:            status,
			HasCurrentExpense: isCreated,
		}

		if lastExpense != nil {
			dueExpense.LastExpenseYear = &lastExpense.Year
			dueExpense.LastExpenseMonth = &lastExpense.Month
			dueExpense.LastExpenseAmount = &lastExpense.Amount
		}

		dueExpenses = append(dueExpenses, dueExpense)
	}

	// Sort by priority: overdue first, then due soon, then by due date
	sortDueExpenses(dueExpenses)

	return &DueExpensesResponse{
		DueExpenses: dueExpenses,
		Year:        year,
		Month:       month,
	}, nil
}

func sortDueExpenses(expenses []DueExpense) {
	statusPriority := map[string]int{"overdue": 0, "due_soon": 1, "upcoming": 2}
	for i := 0; i < len(expenses)-1; i++ {
		for j := 0; j < len(expenses)-i-1; j++ {
			if statusPriority[expenses[j].Status] > statusPriority[expenses[j+1].Status] ||
				(statusPriority[expenses[j].Status] == statusPriority[expenses[j+1].Status] &&
					expenses[j].DaysUntilDue > expenses[j+1].DaysUntilDue) {
				expenses[j], expenses[j+1] = expenses[j+1], expenses[j]
			}
		}
	}
}

func calculateNextDueDate(billDay, billCycle int, lastExpense *expenses.ExpenseItem, targetYear, targetMonth int) time.Time {
	var baseDate time.Time

	if lastExpense != nil {
		// Start from the month after the last expense
		baseDate = time.Date(lastExpense.Year, time.Month(lastExpense.Month), 1, 0, 0, 0, 0, time.UTC)
		baseDate = baseDate.AddDate(0, billCycle, 0)
	} else {
		// No previous expense, start from target month
		baseDate = time.Date(targetYear, time.Month(targetMonth), 1, 0, 0, 0, 0, time.UTC)
	}

	// Set the bill day
	day := billDay
	if day == 0 {
		day = 1 // Default to first day if not specified
	}

	// Get the last day of the base month
	lastDayOfMonth := time.Date(baseDate.Year(), baseDate.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if day > lastDayOfMonth {
		day = lastDayOfMonth
	}

	return time.Date(baseDate.Year(), baseDate.Month(), day, 0, 0, 0, 0, time.UTC)
}
