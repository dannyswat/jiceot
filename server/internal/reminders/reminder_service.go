package reminders

import (
	"errors"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"dannyswat/jiceot/internal/notifications"

	"gorm.io/gorm"
)

type ReminderService struct {
	db *gorm.DB
}

// Request/Response DTOs

type CreateReminderRequest struct {
	Title                 string  `json:"title"`
	Detail                string  `json:"detail"`
	Timezone              string  `json:"timezone"`                // IANA timezone, e.g. America/Los_Angeles
	RemindAt              string  `json:"remind_at"`               // ISO 8601 datetime
	RemindHour            int     `json:"remind_hour"`             // 0-23
	RecurrenceType        string  `json:"recurrence_type"`         // none, daily, weekly, monthly, yearly
	RecurrenceInterval    int     `json:"recurrence_interval"`     // every N periods
	RecurrenceDaysOfWeek  string  `json:"recurrence_days_of_week"` // "0,1,2" etc.
	RecurrenceDayOfMonth  int     `json:"recurrence_day_of_month"` // 1-31, 0=last day
	RecurrenceMonthOfYear int     `json:"recurrence_month_of_year"`
	RecurrenceEndDate     *string `json:"recurrence_end_date"` // optional ISO 8601 date
}

type UpdateReminderRequest struct {
	Title                 string  `json:"title"`
	Detail                string  `json:"detail"`
	Timezone              string  `json:"timezone"`
	RemindAt              string  `json:"remind_at"`
	RemindHour            int     `json:"remind_hour"`
	RecurrenceType        string  `json:"recurrence_type"`
	RecurrenceInterval    int     `json:"recurrence_interval"`
	RecurrenceDaysOfWeek  string  `json:"recurrence_days_of_week"`
	RecurrenceDayOfMonth  int     `json:"recurrence_day_of_month"`
	RecurrenceMonthOfYear int     `json:"recurrence_month_of_year"`
	RecurrenceEndDate     *string `json:"recurrence_end_date"`
	IsActive              bool    `json:"is_active"`
}

type ReminderListResponse struct {
	Reminders []Reminder `json:"reminders"`
	Total     int64      `json:"total"`
}

var (
	ErrReminderNotFound   = errors.New("reminder not found")
	ErrEmptyReminderTitle = errors.New("reminder title cannot be empty")
	ErrInvalidRemindAt    = errors.New("invalid remind_at datetime")
	ErrInvalidRecurrence  = errors.New("invalid recurrence configuration")
	ErrInvalidRemindHour  = errors.New("remind hour must be between 0 and 23")
	ErrInvalidDaysOfWeek  = errors.New("invalid days_of_week for weekly recurrence")
	ErrInvalidDayOfMonth  = errors.New("day_of_month must be between 0 and 31")
	ErrInvalidMonthOfYear = errors.New("month_of_year must be between 1 and 12")
	ErrInvalidTimezone    = errors.New("invalid timezone")
)

func NewReminderService(db *gorm.DB) *ReminderService {
	return &ReminderService{db: db}
}

// CreateReminder creates a new reminder for a user
func (s *ReminderService) CreateReminder(userID uint, req CreateReminderRequest) (*Reminder, error) {
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	remindAt, err := time.Parse(time.RFC3339, req.RemindAt)
	if err != nil {
		return nil, ErrInvalidRemindAt
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return nil, ErrInvalidTimezone
	}

	var endDate *time.Time
	if req.RecurrenceEndDate != nil && *req.RecurrenceEndDate != "" {
		parsedEndDate, parseErr := parseRecurrenceEndDate(*req.RecurrenceEndDate, location)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid recurrence_end_date format: %w", parseErr)
		}
		endDate = &parsedEndDate
	}

	recType := RecurrenceType(req.RecurrenceType)
	if recType == "" {
		recType = RecurrenceNone
	}

	interval := req.RecurrenceInterval
	if interval < 1 {
		interval = 1
	}

	reminder := Reminder{
		Title:                 strings.TrimSpace(req.Title),
		Detail:                strings.TrimSpace(req.Detail),
		Timezone:              timezone,
		RemindAt:              remindAt.UTC(),
		RemindHour:            req.RemindHour,
		RecurrenceType:        recType,
		RecurrenceInterval:    interval,
		RecurrenceDaysOfWeek:  strings.TrimSpace(req.RecurrenceDaysOfWeek),
		RecurrenceDayOfMonth:  req.RecurrenceDayOfMonth,
		RecurrenceMonthOfYear: req.RecurrenceMonthOfYear,
		RecurrenceEndDate:     endDate,
		IsActive:              true,
		UserID:                userID,
	}

	// Pre-compute the next remind time
	reminder.NextRemindAt = s.computeNextRemindAt(&reminder, nil)

	if err := s.db.Create(&reminder).Error; err != nil {
		return nil, fmt.Errorf("failed to create reminder: %w", err)
	}

	return &reminder, nil
}

// GetReminder returns a reminder by ID for a specific user
func (s *ReminderService) GetReminder(userID uint, reminderID uint) (*Reminder, error) {
	var reminder Reminder
	if err := s.db.Where("id = ? AND user_id = ?", reminderID, userID).First(&reminder).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReminderNotFound
		}
		return nil, fmt.Errorf("failed to get reminder: %w", err)
	}
	return &reminder, nil
}

// UpdateReminder updates an existing reminder
func (s *ReminderService) UpdateReminder(userID uint, reminderID uint, req UpdateReminderRequest) (*Reminder, error) {
	if err := s.validateUpdateRequest(req); err != nil {
		return nil, err
	}

	reminder, err := s.GetReminder(userID, reminderID)
	if err != nil {
		return nil, err
	}

	remindAt, err := time.Parse(time.RFC3339, req.RemindAt)
	if err != nil {
		return nil, ErrInvalidRemindAt
	}

	timezone := strings.TrimSpace(req.Timezone)
	if timezone == "" {
		timezone = "UTC"
	}

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return nil, ErrInvalidTimezone
	}

	var endDate *time.Time
	if req.RecurrenceEndDate != nil && *req.RecurrenceEndDate != "" {
		parsedEndDate, parseErr := parseRecurrenceEndDate(*req.RecurrenceEndDate, location)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid recurrence_end_date format: %w", parseErr)
		}
		endDate = &parsedEndDate
	}

	recType := RecurrenceType(req.RecurrenceType)
	if recType == "" {
		recType = RecurrenceNone
	}

	interval := req.RecurrenceInterval
	if interval < 1 {
		interval = 1
	}

	reminder.Title = strings.TrimSpace(req.Title)
	reminder.Detail = strings.TrimSpace(req.Detail)
	reminder.Timezone = timezone
	reminder.RemindAt = remindAt.UTC()
	reminder.RemindHour = req.RemindHour
	reminder.RecurrenceType = recType
	reminder.RecurrenceInterval = interval
	reminder.RecurrenceDaysOfWeek = strings.TrimSpace(req.RecurrenceDaysOfWeek)
	reminder.RecurrenceDayOfMonth = req.RecurrenceDayOfMonth
	reminder.RecurrenceMonthOfYear = req.RecurrenceMonthOfYear
	reminder.RecurrenceEndDate = endDate
	reminder.IsActive = req.IsActive

	// If reactivating a completed reminder, clear completion
	if req.IsActive && reminder.CompletedAt != nil {
		reminder.CompletedAt = nil
	}

	// Recompute next remind time
	reminder.NextRemindAt = s.computeNextRemindAt(reminder, nil)

	if err := s.db.Save(reminder).Error; err != nil {
		return nil, fmt.Errorf("failed to update reminder: %w", err)
	}

	return reminder, nil
}

// DeleteReminder soft-deletes a reminder
func (s *ReminderService) DeleteReminder(userID uint, reminderID uint) error {
	_, err := s.GetReminder(userID, reminderID)
	if err != nil {
		return err
	}

	if err := s.db.Where("id = ? AND user_id = ?", reminderID, userID).Delete(&Reminder{}).Error; err != nil {
		return fmt.Errorf("failed to delete reminder: %w", err)
	}

	return nil
}

// ListReminders returns a paginated list of reminders for a user
func (s *ReminderService) ListReminders(userID uint, limit, offset int, showAll bool) (*ReminderListResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	var reminders []Reminder
	var total int64

	query := s.db.Model(&Reminder{}).Where("user_id = ?", userID)
	if !showAll {
		query = query.Where("is_active = ?", true)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count reminders: %w", err)
	}

	if err := query.Limit(limit).Offset(offset).Order("next_remind_at ASC").Find(&reminders).Error; err != nil {
		return nil, fmt.Errorf("failed to list reminders: %w", err)
	}

	return &ReminderListResponse{
		Reminders: reminders,
		Total:     total,
	}, nil
}

// ToggleReminder toggles the active status of a reminder
func (s *ReminderService) ToggleReminder(userID uint, reminderID uint) (*Reminder, error) {
	reminder, err := s.GetReminder(userID, reminderID)
	if err != nil {
		return nil, err
	}

	reminder.IsActive = !reminder.IsActive
	if reminder.IsActive {
		// Reactivating: clear completion and recompute next time
		reminder.CompletedAt = nil
		reminder.NextRemindAt = s.computeNextRemindAt(reminder, nil)
	}

	if err := s.db.Save(reminder).Error; err != nil {
		return nil, fmt.Errorf("failed to toggle reminder: %w", err)
	}

	return reminder, nil
}

// GetDueReminders returns all reminders that are due now.
// This is called by the background service.
func (s *ReminderService) GetDueReminders(now time.Time) ([]Reminder, error) {
	var reminders []Reminder
	if err := s.db.Where("is_active = ? AND next_remind_at <= ?", true, now).
		Find(&reminders).Error; err != nil {
		return nil, fmt.Errorf("failed to get due reminders: %w", err)
	}
	return reminders, nil
}

// MarkReminded updates a reminder after it has been triggered.
// For one-time reminders, it marks as completed. For recurring, it advances next_remind_at.
func (s *ReminderService) MarkReminded(reminder *Reminder) error {
	now := time.Now().UTC()
	reminder.LastRemindedAt = &now

	if reminder.RecurrenceType == RecurrenceNone {
		// One-time: mark as completed
		reminder.IsActive = false
		reminder.CompletedAt = &now
	} else {
		// Recurring: compute next occurrence
		nextTime := s.computeNextRemindAt(reminder, &now)

		// Check if past end date
		if reminder.RecurrenceEndDate != nil && nextTime.After(*reminder.RecurrenceEndDate) {
			reminder.IsActive = false
			reminder.CompletedAt = &now
		} else {
			reminder.NextRemindAt = nextTime
		}
	}

	if err := s.db.Save(reminder).Error; err != nil {
		return fmt.Errorf("failed to mark reminder as reminded: %w", err)
	}
	return nil
}

// computeNextRemindAt calculates the next trigger time for a reminder.
// If afterTime is provided, it computes the next occurrence after that time.
// If afterTime is nil, it uses the reminder's RemindAt as the base.
func (s *ReminderService) computeNextRemindAt(r *Reminder, afterTime *time.Time) time.Time {
	loc := reminderLocation(r.Timezone)
	now := time.Now().In(loc)

	switch r.RecurrenceType {
	case RecurrenceNone:
		return r.RemindAt.UTC()

	case RecurrenceDaily:
		return s.computeNextDaily(r, afterTime, now)

	case RecurrenceWeekly:
		return s.computeNextWeekly(r, afterTime, now)

	case RecurrenceMonthly:
		return s.computeNextMonthly(r, afterTime, now)

	case RecurrenceYearly:
		return s.computeNextYearly(r, afterTime, now)

	default:
		return r.RemindAt.UTC()
	}
}

func (s *ReminderService) computeNextDaily(r *Reminder, afterTime *time.Time, now time.Time) time.Time {
	loc := reminderLocation(r.Timezone)
	base := r.RemindAt.In(loc)
	if afterTime != nil {
		base = afterTime.In(loc)
	}

	// Start from the base date with the reminder hour
	candidate := time.Date(base.Year(), base.Month(), base.Day(), r.RemindHour, 0, 0, 0, base.Location())

	// If candidate is in the past or equal to afterTime, advance by interval
	if !candidate.After(now) {
		// Calculate how many intervals have passed
		daysDiff := int(now.Sub(candidate).Hours()/24) + 1
		intervalsNeeded := (daysDiff + r.RecurrenceInterval - 1) / r.RecurrenceInterval
		candidate = candidate.AddDate(0, 0, intervalsNeeded*r.RecurrenceInterval)
	}

	return candidate.UTC()
}

func (s *ReminderService) computeNextWeekly(r *Reminder, afterTime *time.Time, now time.Time) time.Time {
	loc := reminderLocation(r.Timezone)
	// Parse days of week
	days := parseDaysOfWeek(r.RecurrenceDaysOfWeek)
	if len(days) == 0 {
		// Default to the day of RemindAt
		days = []int{int(r.RemindAt.In(loc).Weekday())}
	}

	base := r.RemindAt.In(loc)
	if afterTime != nil {
		base = afterTime.In(loc)
	}

	// Start scanning from the day after the base (or from base if it's a valid day and in the future)
	candidate := time.Date(base.Year(), base.Month(), base.Day(), r.RemindHour, 0, 0, 0, base.Location())

	// If we have an afterTime, start from the next day
	if afterTime != nil {
		candidate = candidate.AddDate(0, 0, 1)
	}

	// If the candidate is in the past, advance to today
	if candidate.Before(now) {
		candidate = time.Date(now.Year(), now.Month(), now.Day(), r.RemindHour, 0, 0, 0, now.Location())
		if candidate.Before(now) {
			candidate = candidate.AddDate(0, 0, 1)
		}
	}

	// For interval > 1, we need to track which week we're in relative to the start
	startWeek := weekNumber(r.RemindAt.In(loc))

	// Scan up to 8 weeks * interval to find the next valid day
	maxDays := 7 * r.RecurrenceInterval * 8
	for i := 0; i < maxDays; i++ {
		checkDate := candidate.AddDate(0, 0, i)
		weekday := int(checkDate.Weekday())

		// Check if this weekday is in our list
		if !contains(days, weekday) {
			continue
		}

		// Check if this is in the correct week interval
		if r.RecurrenceInterval > 1 {
			currentWeek := weekNumber(checkDate)
			weekDiff := currentWeek - startWeek
			if weekDiff < 0 {
				weekDiff = -weekDiff
			}
			if weekDiff%r.RecurrenceInterval != 0 {
				continue
			}
		}

		result := time.Date(checkDate.Year(), checkDate.Month(), checkDate.Day(),
			r.RemindHour, 0, 0, 0, checkDate.Location())
		return result.UTC()
	}

	// Fallback: return RemindAt + 1 week
	return r.RemindAt.In(loc).AddDate(0, 0, 7*r.RecurrenceInterval).UTC()
}

func (s *ReminderService) computeNextMonthly(r *Reminder, afterTime *time.Time, now time.Time) time.Time {
	loc := reminderLocation(r.Timezone)
	base := r.RemindAt.In(loc)
	if afterTime != nil {
		base = afterTime.In(loc)
	}

	// Determine the target day of month
	targetDay := r.RecurrenceDayOfMonth
	if targetDay < 0 || targetDay > 31 {
		targetDay = base.Day()
	}

	// Start from the base month
	year := base.Year()
	month := int(base.Month())

	if afterTime != nil {
		// Move to next interval
		month += r.RecurrenceInterval
	}

	// Advance until we find a date in the future
	for i := 0; i < 120; i++ { // Safety limit: 10 years
		// Normalize month/year
		for month > 12 {
			year++
			month -= 12
		}

		candidate := dateWithClampedDay(year, time.Month(month), targetDay, base.Location(), r.RemindHour)

		if candidate.After(now) {
			return candidate.UTC()
		}

		month += r.RecurrenceInterval
	}

	return r.RemindAt.In(loc).AddDate(0, r.RecurrenceInterval, 0).UTC()
}

func (s *ReminderService) computeNextYearly(r *Reminder, afterTime *time.Time, now time.Time) time.Time {
	loc := reminderLocation(r.Timezone)
	base := r.RemindAt.In(loc)
	if afterTime != nil {
		base = afterTime.In(loc)
	}

	targetMonth := r.RecurrenceMonthOfYear
	if targetMonth < 1 || targetMonth > 12 {
		targetMonth = int(base.Month())
	}

	targetDay := r.RecurrenceDayOfMonth
	if targetDay < 0 || targetDay > 31 {
		targetDay = base.Day()
	}

	year := base.Year()
	if afterTime != nil {
		year += r.RecurrenceInterval
	}

	for i := 0; i < 50; i++ { // Safety limit: 50 years
		candidate := dateWithClampedDay(year, time.Month(targetMonth), targetDay, base.Location(), r.RemindHour)

		if candidate.After(now) {
			return candidate.UTC()
		}

		year += r.RecurrenceInterval
	}

	return r.RemindAt.In(loc).AddDate(r.RecurrenceInterval, 0, 0).UTC()
}

// --- Validation ---

func (s *ReminderService) validateCreateRequest(req CreateReminderRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return ErrEmptyReminderTitle
	}
	if req.RemindAt == "" {
		return ErrInvalidRemindAt
	}
	if req.RemindHour < 0 || req.RemindHour > 23 {
		return ErrInvalidRemindHour
	}

	if req.Timezone != "" {
		if _, err := time.LoadLocation(req.Timezone); err != nil {
			return ErrInvalidTimezone
		}
	}

	return s.validateRecurrence(req.RecurrenceType, req.RecurrenceDaysOfWeek, req.RecurrenceDayOfMonth, req.RecurrenceMonthOfYear)
}

func (s *ReminderService) validateUpdateRequest(req UpdateReminderRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return ErrEmptyReminderTitle
	}
	if req.RemindAt == "" {
		return ErrInvalidRemindAt
	}
	if req.RemindHour < 0 || req.RemindHour > 23 {
		return ErrInvalidRemindHour
	}

	if req.Timezone != "" {
		if _, err := time.LoadLocation(req.Timezone); err != nil {
			return ErrInvalidTimezone
		}
	}

	return s.validateRecurrence(req.RecurrenceType, req.RecurrenceDaysOfWeek, req.RecurrenceDayOfMonth, req.RecurrenceMonthOfYear)
}

func (s *ReminderService) validateRecurrence(recType, daysOfWeek string, dayOfMonth, monthOfYear int) error {
	switch RecurrenceType(recType) {
	case RecurrenceNone, "":
		return nil
	case RecurrenceDaily:
		return nil
	case RecurrenceWeekly:
		if daysOfWeek != "" {
			days := parseDaysOfWeek(daysOfWeek)
			for _, d := range days {
				if d < 0 || d > 6 {
					return ErrInvalidDaysOfWeek
				}
			}
		}
		return nil
	case RecurrenceMonthly:
		if dayOfMonth < 0 || dayOfMonth > 31 {
			return ErrInvalidDayOfMonth
		}
		return nil
	case RecurrenceYearly:
		if monthOfYear < 1 || monthOfYear > 12 {
			return ErrInvalidMonthOfYear
		}
		if dayOfMonth < 0 || dayOfMonth > 31 {
			return ErrInvalidDayOfMonth
		}
		return nil
	default:
		return ErrInvalidRecurrence
	}
}

// --- Helpers ---

func parseDaysOfWeek(s string) []int {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var result []int
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if d, err := strconv.Atoi(p); err == nil && d >= 0 && d <= 6 {
			result = append(result, d)
		}
	}
	sort.Ints(result)
	return result
}

func contains(slice []int, val int) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}

func weekNumber(t time.Time) int {
	_, week := t.ISOWeek()
	return week
}

func dateWithClampedDay(year int, month time.Month, day int, loc *time.Location, hour int) time.Time {
	if day == 0 {
		// 0 means last day of month
		return time.Date(year, month+1, 0, hour, 0, 0, 0, loc)
	}
	lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, loc).Day()
	if day > lastDay {
		day = lastDay
	}
	return time.Date(year, month, day, hour, 0, 0, 0, loc)
}

func reminderLocation(timezone string) *time.Location {
	timezone = strings.TrimSpace(timezone)
	if timezone == "" {
		return time.UTC
	}

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}

	return loc
}

func parseRecurrenceEndDate(value string, loc *time.Location) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err == nil {
		return parsed.UTC(), nil
	}

	dateOnly, dateErr := time.ParseInLocation("2006-01-02", value, loc)
	if dateErr != nil {
		return time.Time{}, dateErr
	}

	// For date-only end dates, include the full local day.
	endOfDay := time.Date(
		dateOnly.Year(),
		dateOnly.Month(),
		dateOnly.Day(),
		23,
		59,
		59,
		0,
		loc,
	)

	return endOfDay.UTC(), nil
}

// --- Interface methods for notifications.ReminderChecker ---

// DueReminder is imported from notifications package to avoid circular deps.
// We use a local type alias and convert.
type DueReminderInfo struct {
	ID     uint
	UserID uint
	Title  string
	Detail string
}

// GetDueRemindersForNotification returns reminders that are due for notification.
// Implements notifications.ReminderChecker interface.
func (s *ReminderService) GetDueRemindersForNotification(now time.Time) ([]notifications.DueReminder, error) {
	reminders, err := s.GetDueReminders(now)
	if err != nil {
		return nil, err
	}

	result := make([]notifications.DueReminder, len(reminders))
	for i, r := range reminders {
		result[i] = notifications.DueReminder{
			ID:     r.ID,
			UserID: r.UserID,
			Title:  r.Title,
			Detail: r.Detail,
		}
	}
	return result, nil
}

// MarkRemindedByID marks a reminder as reminded by its ID.
// Implements notifications.ReminderChecker interface.
func (s *ReminderService) MarkRemindedByID(reminderID uint) error {
	var reminder Reminder
	if err := s.db.First(&reminder, reminderID).Error; err != nil {
		return fmt.Errorf("reminder not found: %w", err)
	}
	return s.MarkReminded(&reminder)
}
