import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reminderAPI, notificationSettingsApi, type RecurrenceType } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const RECURRENCE_TYPE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: 'One-time (no repeat)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const START_TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

function toLocalDatetime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function splitLocalDatetime(localDatetime: string): { date: string; time: string } {
  if (!localDatetime) {
    return { date: '', time: '09:00' };
  }

  const [datePart = '', timePart = '09:00'] = localDatetime.split('T');
  return {
    date: datePart,
    time: timePart.slice(0, 5) || '09:00',
  };
}

function joinLocalDatetime(datePart: string, timePart: string): string {
  if (!datePart) return '';
  const normalizedTime = timePart || '09:00';
  return `${datePart}T${normalizedTime}`;
}

function formatLocalTime(localDatetime: string): string {
  if (!localDatetime) return '--:--';
  const { time } = splitLocalDatetime(localDatetime);
  return time;
}

export default function ReminderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [userTimezone, setUserTimezone] = useState(browserTimezone);

  const [formData, setFormData] = useState({
    title: '',
    detail: '',
    remind_at: '',
    remind_hour: 9,
    recurrence_type: 'none' as RecurrenceType,
    recurrence_interval: 1,
    recurrence_days_of_week: [] as number[],
    recurrence_day_of_month: 1,
    recurrence_month_of_year: 1,
    recurrence_end_date: '',
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  const remindAtParts = splitLocalDatetime(formData.remind_at);

  // Load user's saved timezone preference from notification settings
  useEffect(() => {
    const loadUserTimezone = async (): Promise<void> => {
      try {
        const settings = await notificationSettingsApi.get();
        if (settings.timezone) {
          setUserTimezone(settings.timezone);
        }
      } catch {
        // Fall back to browser timezone if settings can't be loaded
      }
    };
    void loadUserTimezone();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      const loadReminder = async (): Promise<void> => {
        try {
          setInitialLoading(true);
          const reminder = await reminderAPI.get(parseInt(id));
          setFormData({
            title: reminder.title,
            detail: reminder.detail || '',
            remind_at: toLocalDatetime(reminder.remind_at),
            remind_hour: reminder.remind_hour,
            recurrence_type: reminder.recurrence_type,
            recurrence_interval: reminder.recurrence_interval || 1,
            recurrence_days_of_week: reminder.recurrence_days_of_week
              ? reminder.recurrence_days_of_week.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
              : [],
            recurrence_day_of_month: reminder.recurrence_day_of_month || 1,
            recurrence_month_of_year: reminder.recurrence_month_of_year || 1,
            recurrence_end_date: toLocalDate(reminder.recurrence_end_date),
            is_active: reminder.is_active,
          });
          // Use the reminder's own timezone if available
          if (reminder.timezone) {
            setUserTimezone(reminder.timezone);
          }
        } catch (err) {
          console.error('Failed to load reminder:', err);
          setError('Failed to load reminder');
        } finally {
          setInitialLoading(false);
        }
      };
      void loadReminder();
    } else {
      setInitialLoading(false);
    }
  }, [isEdit, id]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const remindAtDate = new Date(formData.remind_at);
      const remindAtISO = remindAtDate.toISOString();

      const baseData = {
        title: formData.title.trim(),
        detail: formData.detail.trim(),
        timezone: userTimezone,
        remind_at: remindAtISO,
        remind_hour: formData.remind_hour,
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        recurrence_days_of_week: formData.recurrence_type === 'weekly'
          ? formData.recurrence_days_of_week.join(',')
          : '',
        recurrence_day_of_month:
          formData.recurrence_type === 'monthly' || formData.recurrence_type === 'yearly'
            ? formData.recurrence_day_of_month
            : 0,
        recurrence_month_of_year:
          formData.recurrence_type === 'yearly'
            ? formData.recurrence_month_of_year
            : 0,
        recurrence_end_date: formData.recurrence_end_date || undefined,
      };

      if (isEdit && id) {
        await reminderAPI.update(parseInt(id), { ...baseData, is_active: formData.is_active });
      } else {
        await reminderAPI.create(baseData);
      }

      navigate('/reminders');
    } catch (err: unknown) {
      console.error('Failed to save reminder:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save reminder');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    if (name === 'remind_hour' || name === 'recurrence_interval' || name === 'recurrence_day_of_month' || name === 'recurrence_month_of_year') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRecurrenceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value as RecurrenceType;
    setFormData(prev => ({
      ...prev,
      recurrence_type: value,
      recurrence_interval: 1,
      recurrence_days_of_week: [],
      recurrence_day_of_month: value === 'monthly' || value === 'yearly' ? 1 : 0,
      recurrence_month_of_year: value === 'yearly' ? 1 : 0,
    }));
  };

  const handleRemindDateChange = (datePart: string): void => {
    setFormData(prev => ({
      ...prev,
      remind_at: joinLocalDatetime(datePart, splitLocalDatetime(prev.remind_at).time),
    }));
  };

  const handleRemindTimeChange = (timePart: string): void => {
    setFormData(prev => ({
      ...prev,
      remind_at: joinLocalDatetime(splitLocalDatetime(prev.remind_at).date, timePart),
    }));
  };

  const toggleDayOfWeek = (day: number): void => {
    setFormData(prev => {
      const days = prev.recurrence_days_of_week.includes(day)
        ? prev.recurrence_days_of_week.filter(d => d !== day)
        : [...prev.recurrence_days_of_week, day].sort((a, b) => a - b);
      return { ...prev, recurrence_days_of_week: days };
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const getIntervalLabel = (): string => {
    switch (formData.recurrence_type) {
      case 'daily': return 'days';
      case 'weekly': return 'weeks';
      case 'monthly': return 'months';
      case 'yearly': return 'years';
      default: return '';
    }
  };

  const getRecurrenceSummary = (): string => {
    const interval = formData.recurrence_interval || 1;
    switch (formData.recurrence_type) {
      case 'none':
        return formData.remind_at
          ? `One-time on ${new Date(formData.remind_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${formatLocalTime(formData.remind_at)}`
          : 'One-time reminder';
      case 'daily':
        return interval === 1 ? 'Every day' : `Every ${interval} days`;
      case 'weekly': {
        const dayNames = formData.recurrence_days_of_week
          .map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label || '')
          .filter(Boolean)
          .join(', ');
        const prefix = interval === 1 ? 'Every week' : `Every ${interval} weeks`;
        return dayNames ? `${prefix} on ${dayNames}` : prefix;
      }
      case 'monthly': {
        const day = formData.recurrence_day_of_month === 0
          ? 'last day'
          : `day ${formData.recurrence_day_of_month}`;
        return interval === 1 ? `Every month on ${day}` : `Every ${interval} months on ${day}`;
      }
      case 'yearly': {
        const month = MONTHS.find(m => m.value === formData.recurrence_month_of_year)?.label || '';
        const day = formData.recurrence_day_of_month === 0
          ? 'last day'
          : `${formData.recurrence_day_of_month}`;
        return interval === 1
          ? `Every year on ${month} ${day}`
          : `Every ${interval} years on ${month} ${day}`;
      }
      default: return '';
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/reminders')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Reminder' : 'New Reminder'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update your reminder' : 'Create a new one-time or recurring reminder'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Renew passport, Take medication"
              />
            </div>

            <div>
              <label htmlFor="detail" className="block text-sm font-medium text-gray-700">
                Detail
              </label>
              <textarea
                id="detail"
                name="detail"
                rows={3}
                value={formData.detail}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Optional description or notes"
              />
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">When to Remind</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="remind_date" className="block text-sm font-medium text-gray-700">
                  {formData.recurrence_type === 'none' ? 'Reminder Date *' : 'Start Date *'}
                </label>
                <input
                  type="date"
                  id="remind_date"
                  required
                  value={remindAtParts.date}
                  onChange={(e) => handleRemindDateChange(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="remind_time" className="block text-sm font-medium text-gray-700">
                  {formData.recurrence_type === 'none' ? 'Reminder Time *' : 'Start Time *'}
                </label>
                <select
                  id="remind_time"
                  value={remindAtParts.time}
                  onChange={(e) => handleRemindTimeChange(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  {!START_TIME_OPTIONS.includes(remindAtParts.time) && remindAtParts.time && (
                    <option value={remindAtParts.time}>{remindAtParts.time}</option>
                  )}
                  {START_TIME_OPTIONS.map((timeOption) => (
                    <option key={timeOption} value={timeOption}>
                      {timeOption}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.recurrence_type === 'none'
                    ? `Exact one-time trigger (saved in ${userTimezone})`
                    : `First occurrence anchor (saved in ${userTimezone})`}
                </p>
              </div>

              <div>
                <label htmlFor="remind_hour" className="block text-sm font-medium text-gray-700">
                  Recurring Reminder Hour
                </label>
                <select
                  id="remind_hour"
                  name="remind_hour"
                  value={formData.remind_hour}
                  onChange={handleInputChange}
                  disabled={formData.recurrence_type === 'none'}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.recurrence_type === 'none'
                    ? 'Used for recurring reminders only.'
                    : 'Used as the hourly trigger for recurring reminders.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Repeat Settings</h3>

            <div>
              <label htmlFor="recurrence_type" className="block text-sm font-medium text-gray-700">
                Recurrence Type
              </label>
              <select
                id="recurrence_type"
                name="recurrence_type"
                value={formData.recurrence_type}
                onChange={handleRecurrenceTypeChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {RECURRENCE_TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {formData.recurrence_type !== 'none' && (
              <>
                {/* Interval */}
                <div>
                  <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700">
                    Repeat Every
                  </label>
                  <div className="mt-1 flex items-center space-x-2">
                    <input
                      type="number"
                      id="recurrence_interval"
                      name="recurrence_interval"
                      min={1}
                      max={365}
                      value={formData.recurrence_interval}
                      onChange={handleInputChange}
                      className="block w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <span className="text-sm text-gray-700">{getIntervalLabel()}</span>
                  </div>
                </div>

                {/* Weekly: Days of Week */}
                {formData.recurrence_type === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days of Week
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(day.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            formData.recurrence_days_of_week.includes(day.value)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Select one or more days. If none selected, defaults to the start date's weekday.
                    </p>
                  </div>
                )}

                {/* Monthly: Day of Month */}
                {formData.recurrence_type === 'monthly' && (
                  <div>
                    <label htmlFor="recurrence_day_of_month" className="block text-sm font-medium text-gray-700">
                      Day of Month
                    </label>
                    <select
                      id="recurrence_day_of_month"
                      name="recurrence_day_of_month"
                      value={formData.recurrence_day_of_month}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value={0}>Last day of month</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Yearly: Month and Day */}
                {formData.recurrence_type === 'yearly' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="recurrence_month_of_year" className="block text-sm font-medium text-gray-700">
                        Month
                      </label>
                      <select
                        id="recurrence_month_of_year"
                        name="recurrence_month_of_year"
                        value={formData.recurrence_month_of_year}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        {MONTHS.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="recurrence_day_of_month" className="block text-sm font-medium text-gray-700">
                        Day
                      </label>
                      <select
                        id="recurrence_day_of_month"
                        name="recurrence_day_of_month"
                        value={formData.recurrence_day_of_month}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value={0}>Last day of month</option>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>
                            {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* End Date */}
                <div>
                  <label htmlFor="recurrence_end_date" className="block text-sm font-medium text-gray-700">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    id="recurrence_end_date"
                    name="recurrence_end_date"
                    value={formData.recurrence_end_date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to repeat indefinitely
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Active/Inactive for edit mode */}
          {isEdit && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Status</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active (will send notifications when due)
                </label>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold bg-indigo-500">
                  🔔
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{formData.title || 'Reminder Title'}</h4>
                  <p className="text-sm text-gray-500">
                    {getRecurrenceSummary()}
                    {formData.recurrence_type !== 'none' && ` • recurring at ${formData.remind_hour.toString().padStart(2, '0')}:00`}
                    {' '}&bull; {userTimezone}
                    {formData.recurrence_end_date &&
                      ` • until ${new Date(`${formData.recurrence_end_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </p>
                </div>
              </div>
              {formData.detail && (
                <p className="mt-2 text-sm text-gray-600 ml-13">{formData.detail}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.remind_at}
              className="flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isEdit ? 'Update Reminder' : 'Create Reminder'
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/reminders')}
              className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
