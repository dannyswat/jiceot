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

	stats := &DashboardStats{
		TotalExpenses:    totalExpenses,
		PaymentsMade:     paymentsMade,
		PendingWallets:   len(dueWallets.DueWallets),
		PendingExpenses:  len(dueExpenses.FixedDue) + len(dueExpenses.FlexibleSuggested),
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
		nextDue := nextWalletDueDate(wallet, lastPaymentByWallet[wallet.ID], periodStart)
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
	if err := s.db.Where("user_id = ? AND stopped = ? AND recurring_type <> ?", userID, false, expenses.RecurringTypeNone).Order("next_due_day ASC").Find(&expenseTypes).Error; err != nil {
		return nil, err
	}

	fixedDue := make([]DueExpense, 0)
	flexibleSuggested := make([]DueExpense, 0)
	for _, expenseType := range expenseTypes {
		if expenseType.NextDueDay == nil || expenseType.NextDueDay.After(periodEnd) {
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
			NextDueDate:     expenseType.NextDueDay.Format(expenses.DateOnlyLayout),
			DaysUntilDue:    dayDiff(now, *expenseType.NextDueDay),
		}
		if expenseType.RecurringType == expenses.RecurringTypeFlexible {
			entry.Status = "suggested"
			flexibleSuggested = append(flexibleSuggested, entry)
			continue
		}
		entry.Status = dueStatus(now, *expenseType.NextDueDay)
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

func nextWalletDueDate(wallet expenses.Wallet, lastPayment expenses.Payment, reference time.Time) time.Time {
	periodMonths := expenses.PeriodMonths(wallet.BillPeriod)
	if periodMonths <= 0 {
		periodMonths = 1
	}
	dueDay := wallet.BillDueDay
	if dueDay == 0 {
		dueDay = expenses.EndOfMonth(reference.Year(), int(reference.Month())).Day()
	}
	if lastPayment.ID == 0 {
		return walletDueDate(reference, dueDay)
	}
	base := lastPayment.Date.AddDate(0, periodMonths, 0)
	due := walletDueDate(base, dueDay)
	for due.Before(reference) {
		base = base.AddDate(0, periodMonths, 0)
		due = walletDueDate(base, dueDay)
	}
	return due
}

func walletDueDate(reference time.Time, dueDay int) time.Time {
	lastDay := time.Date(reference.Year(), reference.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if dueDay > lastDay {
		dueDay = lastDay
	}
	return time.Date(reference.Year(), reference.Month(), dueDay, 0, 0, 0, 0, time.UTC)
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
