package notifications

import "testing"

func TestNormalizeNotificationTimezone(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "alias is normalized", input: "Asia/Hong_Hong", want: "Asia/Hong_Kong"},
		{name: "blank defaults to utc", input: "", want: "UTC"},
		{name: "whitespace trims before default", input: "   ", want: "UTC"},
		{name: "valid timezone unchanged", input: "Asia/Tokyo", want: "Asia/Tokyo"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got := normalizeNotificationTimezone(test.input)
			if got != test.want {
				t.Fatalf("normalizeNotificationTimezone(%q) = %q, want %q", test.input, got, test.want)
			}
		})
	}
}

func TestLoadNotificationLocationSupportsHongKongAlias(t *testing.T) {
	loc, normalized, err := loadNotificationLocation("Asia/Hong_Hong")
	if err != nil {
		t.Fatalf("loadNotificationLocation returned error: %v", err)
	}
	if normalized != "Asia/Hong_Kong" {
		t.Fatalf("normalized timezone = %q, want %q", normalized, "Asia/Hong_Kong")
	}
	if loc.String() != "Asia/Hong_Kong" {
		t.Fatalf("location = %q, want %q", loc.String(), "Asia/Hong_Kong")
	}
}
