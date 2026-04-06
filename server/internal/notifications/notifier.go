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
		loc, err := time.LoadLocation(setting.Timezone)
		if err != nil {
			log.Printf("[notifier] Invalid timezone %q for user %d: %v", setting.Timezone, setting.UserID, err)
			continue
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

	// 1. Due wallets (credit wallets with bill_due_day approaching)
	var wallets []expenses.Wallet
	if err := n.db.Where("user_id = ? AND is_credit = ? AND stopped = ? AND bill_period <> ?",
		userID, true, false, expenses.WalletPeriodNone).
		Find(&wallets).Error; err == nil {
		for _, w := range wallets {
			nextDue := computeWalletNextDue(w, now)
			if !nextDue.After(cutoff) {
				days := dayDiff(now, nextDue)
				items = append(items, fmt.Sprintf("💳 %s — %s", w.Name, dueLabel(days)))
			}
		}
	}

	// 2. Due expense types (recurring with next_due_day approaching)
	var expenseTypes []expenses.ExpenseType
	if err := n.db.Where("user_id = ? AND stopped = ? AND recurring_type <> ? AND next_due_day IS NOT NULL AND next_due_day <= ?",
		userID, false, expenses.RecurringTypeNone, cutoff).
		Find(&expenseTypes).Error; err == nil {
		for _, et := range expenseTypes {
			if et.NextDueDay == nil {
				continue
			}
			days := dayDiff(now, *et.NextDueDay)
			label := "📋"
			if et.RecurringType == expenses.RecurringTypeFlexible {
				label = "🔄"
			}
			items = append(items, fmt.Sprintf("%s %s — %s", label, et.Name, dueLabel(days)))
		}
	}

	return items
}

func computeWalletNextDue(wallet expenses.Wallet, now time.Time) time.Time {
	dueDay := wallet.BillDueDay
	if dueDay == 0 {
		dueDay = expenses.EndOfMonth(now.Year(), int(now.Month())).Day()
	}
	lastDay := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if dueDay > lastDay {
		dueDay = lastDay
	}
	due := time.Date(now.Year(), now.Month(), dueDay, 0, 0, 0, 0, time.UTC)
	if due.Before(now) {
		due = due.AddDate(0, 1, 0)
	}
	return due
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
