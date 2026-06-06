package notifications

import (
	"testing"

	"dannyswat/jiceot/internal/expenses"
)

func TestShouldNotifyExpenseType(t *testing.T) {
	tests := []struct {
		name         string
		expenseType  expenses.ExpenseType
		daysUntilDue int
		want         bool
	}{
		{
			name: "weekly skips advance notifications",
			expenseType: expenses.ExpenseType{
				RecurringType:   expenses.RecurringTypeFlexible,
				RecurringPeriod: expenses.RecurringPeriodWeekly,
				ReminderType:    expenses.ReminderTypeInAdvance,
			},
			daysUntilDue: 1,
			want:         false,
		},
		{
			name: "weekly notifies on due date",
			expenseType: expenses.ExpenseType{
				RecurringType:   expenses.RecurringTypeFlexible,
				RecurringPeriod: expenses.RecurringPeriodWeekly,
				ReminderType:    expenses.ReminderTypeInAdvance,
			},
			daysUntilDue: 0,
			want:         true,
		},
		{
			name: "weekly skips overdue notifications after due date",
			expenseType: expenses.ExpenseType{
				RecurringType:   expenses.RecurringTypeFlexible,
				RecurringPeriod: expenses.RecurringPeriodWeekly,
				ReminderType:    expenses.ReminderTypeOnDay,
			},
			daysUntilDue: -1,
			want:         false,
		},
		{
			name: "monthly on day still includes overdue items",
			expenseType: expenses.ExpenseType{
				RecurringType:   expenses.RecurringTypeFixedDay,
				RecurringPeriod: expenses.RecurringPeriodMonthly,
				ReminderType:    expenses.ReminderTypeOnDay,
			},
			daysUntilDue: -1,
			want:         true,
		},
		{
			name: "monthly in advance still includes upcoming items",
			expenseType: expenses.ExpenseType{
				RecurringType:   expenses.RecurringTypeFixedDay,
				RecurringPeriod: expenses.RecurringPeriodMonthly,
				ReminderType:    expenses.ReminderTypeInAdvance,
			},
			daysUntilDue: 2,
			want:         true,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := shouldNotifyExpenseType(test.expenseType, test.daysUntilDue)
			if got != test.want {
				t.Fatalf("shouldNotifyExpenseType(%+v, %d) = %t, want %t", test.expenseType, test.daysUntilDue, got, test.want)
			}
		})
	}
}
