package notifications

import (
	"strings"
	"time"
)

var notificationTimezoneAliases = map[string]string{
	"Asia/Hong_Hong": "Asia/Hong_Kong",
}

func normalizeNotificationTimezone(value string) string {
	timezone := strings.TrimSpace(value)
	if timezone == "" {
		return "UTC"
	}

	if alias, ok := notificationTimezoneAliases[timezone]; ok {
		return alias
	}

	return timezone
}

func loadNotificationLocation(value string) (*time.Location, string, error) {
	normalized := normalizeNotificationTimezone(value)
	loc, err := time.LoadLocation(normalized)
	if err != nil {
		return nil, normalized, err
	}

	return loc, normalized, nil
}
