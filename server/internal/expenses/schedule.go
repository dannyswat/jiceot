package expenses

import (
	"fmt"
	"time"
)

const DateOnlyLayout = "2006-01-02"

func ParseDateOnly(value string) (time.Time, error) {
	parsed, err := time.Parse(DateOnlyLayout, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date format, expected YYYY-MM-DD")
	}
	return NormalizeDateOnly(parsed), nil
}

func NormalizeDateOnly(value time.Time) time.Time {
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, time.UTC)
}

func BeginningOfMonth(year, month int) time.Time {
	return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
}

func EndOfMonth(year, month int) time.Time {
	return BeginningOfMonth(year, month).AddDate(0, 1, -1)
}

func PeriodMonths(period string) int {
	switch period {
	case RecurringPeriodMonthly:
		return 1
	case RecurringPeriodBimonthly:
		return 2
	case RecurringPeriodQuarterly:
		return 3
	case RecurringPeriodFourMonths:
		return 4
	case RecurringPeriodSemiannually:
		return 6
	case RecurringPeriodAnnually:
		return 12
	default:
		return 0
	}
}

func AddRecurringPeriod(value time.Time, recurringPeriod string) (time.Time, error) {
	value = NormalizeDateOnly(value)

	switch recurringPeriod {
	case RecurringPeriodWeekly:
		return value.AddDate(0, 0, 7), nil
	case RecurringPeriodBiweekly:
		return value.AddDate(0, 0, 14), nil
	case RecurringPeriodMonthly, RecurringPeriodBimonthly, RecurringPeriodQuarterly, RecurringPeriodFourMonths, RecurringPeriodSemiannually, RecurringPeriodAnnually:
		months := PeriodMonths(recurringPeriod)
		if months == 0 {
			return time.Time{}, fmt.Errorf("invalid recurring period")
		}
		return value.AddDate(0, months, 0), nil
	case RecurringPeriodNone, "":
		return value, nil
	default:
		return time.Time{}, fmt.Errorf("invalid recurring period")
	}
}

func ComputeInitialNextDueDay(from time.Time, recurringType, recurringPeriod string, recurringDueDay int) (*time.Time, error) {
	from = NormalizeDateOnly(from)

	switch recurringType {
	case RecurringTypeNone, "":
		return nil, nil
	case RecurringTypeFlexible:
		candidate := from
		return &candidate, nil
	case RecurringTypeFixedDay:
		if recurringDueDay < 1 || recurringDueDay > 31 {
			return nil, fmt.Errorf("recurring due day must be between 1 and 31")
		}
		candidate := withClampedDay(from.Year(), from.Month(), recurringDueDay)
		if candidate.Before(from) {
			nextBase, err := AddRecurringPeriod(from, recurringPeriod)
			if err != nil {
				return nil, err
			}
			candidate = withClampedDay(nextBase.Year(), nextBase.Month(), recurringDueDay)
		}
		candidate = NormalizeDateOnly(candidate)
		return &candidate, nil
	default:
		return nil, fmt.Errorf("invalid recurring type")
	}
}

func AdvanceNextDueDayFrom(referenceDate time.Time, recurringType, recurringPeriod string, recurringDueDay int) (*time.Time, error) {
	referenceDate = NormalizeDateOnly(referenceDate)

	switch recurringType {
	case RecurringTypeNone, "":
		return nil, nil
	case RecurringTypeFlexible:
		nextDate, err := AddRecurringPeriod(referenceDate, recurringPeriod)
		if err != nil {
			return nil, err
		}
		nextDate = NormalizeDateOnly(nextDate)
		return &nextDate, nil
	case RecurringTypeFixedDay:
		nextBase, err := AddRecurringPeriod(referenceDate, recurringPeriod)
		if err != nil {
			return nil, err
		}
		nextDate := NormalizeDateOnly(withClampedDay(nextBase.Year(), nextBase.Month(), recurringDueDay))
		return &nextDate, nil
	default:
		return nil, fmt.Errorf("invalid recurring type")
	}
}

func withClampedDay(year int, month time.Month, day int) time.Time {
	if day < 1 {
		day = 1
	}
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
}
