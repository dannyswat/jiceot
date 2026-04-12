package notifications

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"dannyswat/jiceot/internal/expenses"

	"gorm.io/gorm"
)

type Notifier struct {
	db     *gorm.DB
	bark   *BarkClient
	cancel context.CancelFunc
	done   chan struct{}
}

func NewNotifier(db *gorm.DB) *Notifier {
	return &Notifier{
		db:   db,
		bark: NewBarkClient(),
		done: make(chan struct{}),
	}
}

// Start begins the background notification loop. It checks every minute
// whether any user's reminder time has arrived (in their local timezone)
// and sends a Bark notification if there are due items.
func (n *Notifier) Start() {
	ctx, cancel := context.WithCancel(context.Background())
	n.cancel = cancel

	go func() {
		defer close(n.done)
		ticker := time.NewTicker(1 * time.Minute)
		defer ticker.Stop()

		log.Println("[notifier] Background notifier started")

		// Run once immediately on startup
		n.checkAndNotify()

		for {
			select {
			case <-ctx.Done():
				log.Println("[notifier] Background notifier stopped")
				return
			case <-ticker.C:
				n.checkAndNotify()
			}
		}
	}()
}

// Stop gracefully shuts down the notifier.
func (n *Notifier) Stop() {
	if n.cancel != nil {
		n.cancel()
		<-n.done
	}
}

func (n *Notifier) checkAndNotify() {
	var settings []NotificationSetting
	if err := n.db.Where("enabled = ? AND bark_url <> ''", true).Find(&settings).Error; err != nil {
		log.Printf("[notifier] Failed to load notification settings: %v", err)
		return
	}

	now := time.Now().UTC()

	for _, setting := range settings {
		loc, normalizedTimezone, err := loadNotificationLocation(setting.Timezone)
		if err != nil {
			log.Printf("[notifier] Invalid timezone %q for user %d: %v", setting.Timezone, setting.UserID, err)
			continue
		}
		if normalizedTimezone != setting.Timezone {
			if err := n.db.Model(&NotificationSetting{}).Where("id = ?", setting.ID).Update("timezone", normalizedTimezone).Error; err != nil {
				log.Printf("[notifier] Failed to normalize timezone %q for user %d: %v", setting.Timezone, setting.UserID, err)
			} else {
				setting.Timezone = normalizedTimezone
			}
		}

		localNow := now.In(loc)
		localTimeStr := localNow.Format("15:04")

		// Check if it's the right time (within the current minute)
		if localTimeStr != setting.ReminderTime {
			continue
		}

		// Check if we already notified today
		if setting.LastNotifiedAt != nil {
			lastLocal := setting.LastNotifiedAt.In(loc)
			if lastLocal.Format("2006-01-02") == localNow.Format("2006-01-02") {
				continue
			}
		}

		// Collect due items for this user
		items := n.collectDueItems(setting.UserID, setting.DueDaysAhead)
		if len(items) == 0 {
			continue
		}

		// Build notification
		title := fmt.Sprintf("Jiceot: %d due item(s)", len(items))
		body := strings.Join(items, "\n")

		if err := n.bark.Send(setting.BarkURL, title, body); err != nil {
			log.Printf("[notifier] Failed to send bark to user %d: %v", setting.UserID, err)
			continue
		}

		// Update last notified time
		n.db.Model(&NotificationSetting{}).Where("id = ?", setting.ID).Update("last_notified_at", now)
		log.Printf("[notifier] Sent notification to user %d: %d items", setting.UserID, len(items))
	}
}

func (n *Notifier) collectDueItems(userID uint, daysAhead int) []string {
	now := expenses.NormalizeDateOnly(time.Now().UTC())
	cutoff := now.AddDate(0, 0, daysAhead)

	var items []string

	// 1. Due wallets, using the same due-date logic as the dashboard but
	// filtered by the notification lead-time window.
	var wallets []expenses.Wallet
	if err := n.db.Where("user_id = ? AND is_credit = ? AND stopped = ? AND bill_period <> ?",
		userID, true, false, expenses.WalletPeriodNone).
		Find(&wallets).Error; err == nil {
		var payments []expenses.Payment
		if len(wallets) > 0 {
			if err := n.db.Where("user_id = ? AND wallet_id IN ? AND date <= ?", userID, walletIDs(wallets), cutoff).Order("date DESC").Find(&payments).Error; err != nil {
				payments = nil
			}
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

		for _, w := range wallets {
			var lastPayment *expenses.Payment
			if payment, ok := lastPaymentByWallet[w.ID]; ok {
				lastPayment = &payment
			}
			nextDue := expenses.NextWalletDueDate(w, now, lastPayment)
			if nextDue.After(cutoff) {
				continue
			}
			monthKey := nextDue.Format("2006-01")
			if paidMonths[w.ID][monthKey] {
				continue
			}
			days := dayDiff(now, nextDue)
			items = append(items, fmt.Sprintf("💳 %s — %s", w.Name, dueLabel(days)))
		}
	}

	// 2. Due expense types, using the same computed next-due logic as the dashboard.
	var expenseTypes []expenses.ExpenseType
	if err := n.db.Where("user_id = ? AND stopped = ? AND recurring_type <> ?",
		userID, false, expenses.RecurringTypeNone).
		Find(&expenseTypes).Error; err == nil {
		fixedTypeIDs := make([]uint, 0)
		for _, expenseType := range expenseTypes {
			if expenseType.RecurringType == expenses.RecurringTypeFixedDay {
				fixedTypeIDs = append(fixedTypeIDs, expenseType.ID)
			}
		}

		lastExpenseByType := make(map[uint]time.Time)
		if len(fixedTypeIDs) > 0 {
			type result struct {
				ExpenseTypeID uint
				LastDate      time.Time
			}
			var results []result
			if err := n.db.Model(&expenses.Expense{}).
				Select("expense_type_id, MAX(date) as last_date").
				Where("user_id = ? AND expense_type_id IN ?", userID, fixedTypeIDs).
				Group("expense_type_id").
				Find(&results).Error; err == nil {
				for _, result := range results {
					lastExpenseByType[result.ExpenseTypeID] = result.LastDate
				}
			}
		}

		for _, et := range expenseTypes {
			var lastExpenseDate *time.Time
			if lastDate, ok := lastExpenseByType[et.ID]; ok {
				lastExpenseDate = &lastDate
			}
			nextDue, err := expenses.NextExpenseTypeDueDate(et, now, lastExpenseDate)
			if err != nil || nextDue == nil || nextDue.After(cutoff) {
				continue
			}
			days := dayDiff(now, *nextDue)
			effectiveReminderType := expenses.EffectiveReminderType(et)
			if effectiveReminderType == expenses.ReminderTypeNone {
				continue
			}
			if effectiveReminderType == expenses.ReminderTypeOnDay && days > 0 {
				continue
			}
			label := "📋"
			if et.RecurringType == expenses.RecurringTypeFlexible {
				label = "🔄"
			}
			items = append(items, fmt.Sprintf("%s %s — %s", label, et.Name, dueLabel(days)))
		}
	}

	return items
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

func dueLabel(days int) string {
	if days < 0 {
		return fmt.Sprintf("%d day(s) overdue", -days)
	}
	if days == 0 {
		return "due today"
	}
	if days == 1 {
		return "due tomorrow"
	}
	return fmt.Sprintf("due in %d days", days)
}
