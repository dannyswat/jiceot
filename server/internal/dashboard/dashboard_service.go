package dashboard

import (
	"sort"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type DashboardService struct {
	db *gorm.DB
}

type DashboardStats struct {
	TotalExpenses    float64      `json:"total_expenses"`
	PaymentsMade     int64        `json:"payments_made"`
	PendingWallets   int          `json:"pending_wallets"`
	PendingExpenses  int          `json:"pending_expenses"`
	Categories       int64        `json:"categories"`
	DueWallets       []DueWallet  `json:"due_wallets"`
	FixedExpenses    []DueExpense `json:"fixed_expenses"`
	FlexibleExpenses []DueExpense `json:"flexible_expenses"`
}

type DueWallet struct {
	ID           uint    `json:"id"`
	Name         string  `json:"name"`
	Icon         string  `json:"icon"`
	Color        string  `json:"color"`
	BillPeriod   string  `json:"bill_period"`
	BillDueDay   int     `json:"bill_due_day"`
	NextDueDate  string  `json:"next_due_date"`
	DaysUntilDue int     `json:"days_until_due"`
	Status       string  `json:"status"`
	HasPayment   bool    `json:"has_payment"`
	LastPaidAt   *string `json:"last_paid_at,omitempty"`
}

type DueWalletsResponse struct {
	DueWallets []DueWallet `json:"due_wallets"`
	Year       int         `json:"year"`
	Month      int         `json:"month"`
}

type DueExpense struct {
	ID              uint    `json:"id"`
	Name            string  `json:"name"`
	Icon            string  `json:"icon"`
	Color           string  `json:"color"`
	DefaultAmount   float64 `json:"default_amount"`
	RecurringType   string  `json:"recurring_type"`
	RecurringPeriod string  `json:"recurring_period"`
	ReminderType    string  `json:"reminder_type"`
	NextDueDate     string  `json:"next_due_date"`
	DaysUntilDue    int     `json:"days_until_due"`
	Status          string  `json:"status"`
}

type DueExpensesResponse struct {
	FixedDue          []DueExpense `json:"fixed_due"`
	FlexibleSuggested []DueExpense `json:"flexible_suggested"`
	Year              int          `json:"year"`
	Month             int          `json:"month"`
}

func NewDashboardService(db *gorm.DB) *DashboardService {
	return &DashboardService{db: db}
}

func (s *DashboardService) GetDashboardStats(userID uint) (*DashboardStats, error) {
	now := time.Now().UTC()
	start := expenses.BeginningOfMonth(now.Year(), int(now.Month()))
	end := expenses.EndOfMonth(now.Year(), int(now.Month()))

	var totalExpenses float64
	if err := s.db.Model(&expenses.Expense{}).Where("user_id = ? AND date >= ? AND date <= ?", userID, start, end).Select("COALESCE(SUM(amount), 0)").Scan(&totalExpenses).Error; err != nil {
		return nil, err
	}

	var paymentsMade int64
	if err := s.db.Model(&expenses.Payment{}).Where("user_id = ? AND date >= ? AND date <= ?", userID, start, end).Count(&paymentsMade).Error; err != nil {
		return nil, err
	}

	var categoryCount int64
	if err := s.db.Model(&expenses.ExpenseType{}).Where("user_id = ?", userID).Count(&categoryCount).Error; err != nil {
		return nil, err
	}

	dueWallets, err := s.GetDueWallets(userID, now.Year(), int(now.Month()))
	if err != nil {
		return nil, err
	}
	dueExpenses, err := s.GetDueExpenses(userID, now.Year(), int(now.Month()))
	if err != nil {
		return nil, err
	}

	pendingCount := 0
	for _, w := range dueWallets.DueWallets {
		if w.DaysUntilDue <= 5 {
			pendingCount++
		}
	}

	pendingExpenseCount := 0
	for _, e := range dueExpenses.FixedDue {
		if e.DaysUntilDue <= 5 {
			pendingExpenseCount++
		}
	}
	for _, e := range dueExpenses.FlexibleSuggested {
		if e.DaysUntilDue <= 5 {
			pendingExpenseCount++
		}
	}

	stats := &DashboardStats{
		TotalExpenses:    totalExpenses,
		PaymentsMade:     paymentsMade,
		PendingWallets:   pendingCount,
		PendingExpenses:  pendingExpenseCount,
		Categories:       categoryCount,
		DueWallets:       limitDueWallets(dueWallets.DueWallets, 5),
		FixedExpenses:    limitDueExpenses(dueExpenses.FixedDue, 5),
		FlexibleExpenses: limitDueExpenses(dueExpenses.FlexibleSuggested, 5),
	}

	return stats, nil
}

func (s *DashboardService) GetDueWallets(userID uint, year, month int) (*DueWalletsResponse, error) {
	periodStart := expenses.BeginningOfMonth(year, month)
	periodEnd := expenses.EndOfMonth(year, month)
	now := expenses.NormalizeDateOnly(time.Now().UTC())

	var wallets []expenses.Wallet
	if err := s.db.Where("user_id = ? AND is_credit = ? AND stopped = ? AND bill_period <> ?", userID, true, false, expenses.WalletPeriodNone).Find(&wallets).Error; err != nil {
		return nil, err
	}

	var payments []expenses.Payment
	if err := s.db.Where("user_id = ? AND wallet_id IN ? AND date <= ?", userID, walletIDs(wallets), periodEnd).Order("date DESC").Find(&payments).Error; err != nil {
		return nil, err
	}

	lastPaymentByWallet := make(map[uint]expenses.Payment)
	paidMonths := make(map[uint]map[string]bool)
	for _, payment := range payments {
		if _, ok := lastPaymentByWallet[payment.WalletID]; !ok {
			lastPaymentByWallet[payment.WalletID] = payment
		}
		monthKey := payment.Date.Format("2006-01")
		if _, ok := paidMonths[payment.WalletID]; !ok {
			paidMonths[payment.WalletID] = make(map[string]bool)
		}
		paidMonths[payment.WalletID][monthKey] = true
	}

	dueWallets := make([]DueWallet, 0)
	for _, wallet := range wallets {
		var lastPayment *expenses.Payment
		if payment, ok := lastPaymentByWallet[wallet.ID]; ok {
			lastPayment = &payment
		}
		nextDue := expenses.NextWalletDueDate(wallet, periodStart, lastPayment)
		if nextDue.After(periodEnd) {
			continue
		}
		monthKey := nextDue.Format("2006-01")
		hasPayment := paidMonths[wallet.ID][monthKey]
		if hasPayment {
			continue
		}
		status := dueStatus(now, nextDue)
		entry := DueWallet{
			ID:           wallet.ID,
			Name:         wallet.Name,
			Icon:         wallet.Icon,
			Color:        wallet.Color,
			BillPeriod:   wallet.BillPeriod,
			BillDueDay:   wallet.BillDueDay,
			NextDueDate:  nextDue.Format(expenses.DateOnlyLayout),
			DaysUntilDue: dayDiff(now, nextDue),
			Status:       status,
			HasPayment:   false,
		}
		if lastPayment, ok := lastPaymentByWallet[wallet.ID]; ok {
			formatted := lastPayment.Date.Format(expenses.DateOnlyLayout)
			entry.LastPaidAt = &formatted
		}
		dueWallets = append(dueWallets, entry)
	}

	sort.Slice(dueWallets, func(i, j int) bool {
		if dueWallets[i].Status != dueWallets[j].Status {
			return statusPriority(dueWallets[i].Status) < statusPriority(dueWallets[j].Status)
		}
		return dueWallets[i].DaysUntilDue < dueWallets[j].DaysUntilDue
	})

	return &DueWalletsResponse{DueWallets: dueWallets, Year: year, Month: month}, nil
}

func (s *DashboardService) GetDueExpenses(userID uint, year, month int) (*DueExpensesResponse, error) {
	periodEnd := expenses.EndOfMonth(year, month)
	now := expenses.NormalizeDateOnly(time.Now().UTC())

	var expenseTypes []expenses.ExpenseType
	if err := s.db.Where("user_id = ? AND stopped = ? AND recurring_type <> ?", userID, false, expenses.RecurringTypeNone).Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	// For fixed_day types, compute next due date from last expense per type
	fixedTypeIDs := make([]uint, 0)
	for _, et := range expenseTypes {
		if et.RecurringType == expenses.RecurringTypeFixedDay {
			fixedTypeIDs = append(fixedTypeIDs, et.ID)
		}
	}
	lastExpenseByType := make(map[uint]time.Time)
	if len(fixedTypeIDs) > 0 {
		type result struct {
			ExpenseTypeID uint
			LastDate      time.Time
		}
		var results []result
		if err := s.db.Model(&expenses.Expense{}).
			Select("expense_type_id, MAX(date) as last_date").
			Where("user_id = ? AND expense_type_id IN ?", userID, fixedTypeIDs).
			Group("expense_type_id").
			Find(&results).Error; err != nil {
			return nil, err
		}
		for _, r := range results {
			lastExpenseByType[r.ExpenseTypeID] = r.LastDate
		}
	}

	fixedDue := make([]DueExpense, 0)
	flexibleSuggested := make([]DueExpense, 0)
	for _, expenseType := range expenseTypes {
		var lastExpenseDate *time.Time
		if lastDate, ok := lastExpenseByType[expenseType.ID]; ok {
			lastExpenseDate = &lastDate
		}
		nextDue, err := expenses.NextExpenseTypeDueDate(expenseType, now, lastExpenseDate)
		if err != nil {
			continue
		}

		if nextDue == nil || nextDue.After(periodEnd) {
			continue
		}
		entry := DueExpense{
			ID:              expenseType.ID,
			Name:            expenseType.Name,
			Icon:            expenseType.Icon,
			Color:           expenseType.Color,
			DefaultAmount:   expenseType.DefaultAmount,
			RecurringType:   expenseType.RecurringType,
			RecurringPeriod: expenseType.RecurringPeriod,
			ReminderType:    expenses.EffectiveReminderType(expenseType),
			NextDueDate:     nextDue.Format(expenses.DateOnlyLayout),
			DaysUntilDue:    dayDiff(now, *nextDue),
		}
		if !shouldIncludeDueExpense(entry.ReminderType, entry.DaysUntilDue) {
			continue
		}
		if expenseType.RecurringType == expenses.RecurringTypeFlexible {
			entry.Status = "suggested"
			flexibleSuggested = append(flexibleSuggested, entry)
			continue
		}
		entry.Status = dueStatus(now, *nextDue)
		fixedDue = append(fixedDue, entry)
	}

	sort.Slice(fixedDue, func(i, j int) bool {
		if fixedDue[i].Status != fixedDue[j].Status {
			return statusPriority(fixedDue[i].Status) < statusPriority(fixedDue[j].Status)
		}
		return fixedDue[i].DaysUntilDue < fixedDue[j].DaysUntilDue
	})
	sort.Slice(flexibleSuggested, func(i, j int) bool {
		return flexibleSuggested[i].DaysUntilDue < flexibleSuggested[j].DaysUntilDue
	})

	return &DueExpensesResponse{FixedDue: fixedDue, FlexibleSuggested: flexibleSuggested, Year: year, Month: month}, nil
}

func walletIDs(wallets []expenses.Wallet) []uint {
	ids := make([]uint, 0, len(wallets))
	for _, wallet := range wallets {
		ids = append(ids, wallet.ID)
	}
	return ids
}

func dayDiff(from, to time.Time) int {
	from = expenses.NormalizeDateOnly(from)
	to = expenses.NormalizeDateOnly(to)
	return int(to.Sub(from).Hours() / 24)
}

func dueStatus(now, dueDate time.Time) string {
	days := dayDiff(now, dueDate)
	if days < 0 {
		return "overdue"
	}
	if days <= 5 {
		return "due_soon"
	}
	return "upcoming"
}

func shouldIncludeDueExpense(reminderType string, daysUntilDue int) bool {
	switch reminderType {
	case expenses.ReminderTypeNone:
		return false
	case expenses.ReminderTypeOnDay:
		return daysUntilDue <= 0
	default:
		return true
	}
}

func statusPriority(status string) int {
	switch status {
	case "overdue":
		return 0
	case "due_soon":
		return 1
	case "suggested":
		return 2
	default:
		return 3
	}
}

func limitDueWallets(items []DueWallet, limit int) []DueWallet {
	if len(items) <= limit {
		return items
	}
	return items[:limit]
}

func limitDueExpenses(items []DueExpense, limit int) []DueExpense {
	if len(items) <= limit {
		return items
	}
	return items[:limit]
}
