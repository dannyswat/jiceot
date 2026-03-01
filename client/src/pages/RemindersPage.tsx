import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reminderAPI, type Reminder, type RecurrenceType } from '../services/api';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BellIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatRecurrence(r: Reminder): string {
  const interval = r.recurrence_interval || 1;
  switch (r.recurrence_type) {
    case 'none':
      return 'One-time';
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;
    case 'weekly': {
      const days = r.recurrence_days_of_week
        ? r.recurrence_days_of_week.split(',').map(d => DAYS_OF_WEEK[parseInt(d.trim())] || '').filter(Boolean).join(', ')
        : '';
      const prefix = interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
      return days ? `${prefix} on ${days}` : prefix;
    }
    case 'monthly': {
      const day = r.recurrence_day_of_month === 0
        ? 'last day'
        : `day ${r.recurrence_day_of_month}`;
      return interval === 1 ? `Monthly on ${day}` : `Every ${interval} months on ${day}`;
    }
    case 'yearly': {
      const month = r.recurrence_month_of_year
        ? new Date(2000, r.recurrence_month_of_year - 1).toLocaleString('default', { month: 'short' })
        : '';
      const day = r.recurrence_day_of_month === 0
        ? 'last day'
        : `${r.recurrence_day_of_month}`;
      return interval === 1
        ? `Yearly on ${month} ${day}`
        : `Every ${interval} years on ${month} ${day}`;
    }
    default:
      return 'Unknown';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTriggerTiming(reminder: Reminder): string {
  if (reminder.recurrence_type === 'none') {
    return `Scheduled: ${formatDate(reminder.remind_at)}`;
  }
  return `Recurring hour: ${reminder.remind_hour.toString().padStart(2, '0')}:00`;
}

function formatNextRemind(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const recurrenceTypeColors: Record<RecurrenceType, string> = {
  none: 'bg-gray-100 text-gray-700',
  daily: 'bg-blue-100 text-blue-700',
  weekly: 'bg-green-100 text-green-700',
  monthly: 'bg-purple-100 text-purple-700',
  yearly: 'bg-amber-100 text-amber-700',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const loadReminders = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await reminderAPI.list({ show_all: showAll });
      setReminders(response.reminders);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReminders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const handleDelete = async (id: number, title: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await reminderAPI.delete(id);
      void loadReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      setError('Failed to delete reminder');
    }
  };

  const handleToggle = async (id: number): Promise<void> => {
    try {
      await reminderAPI.toggle(id);
      void loadReminders();
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
      setError('Failed to toggle reminder');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600">Manage your one-time and recurring reminders</p>
        </div>
        <Link
          to="/reminders/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors min-w-[120px]"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Reminder
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-500">Your local timezone: {localTimezone}</p>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Show completed & inactive reminders</span>
          </label>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Reminders List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reminders.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No reminders</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first reminder to get started.</p>
            <div className="mt-6">
              <Link
                to="/reminders/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Reminder
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${!reminder.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {reminder.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${recurrenceTypeColors[reminder.recurrence_type]}`}>
                        {formatRecurrence(reminder)}
                      </span>
                      {!reminder.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          {reminder.completed_at ? 'Completed' : 'Inactive'}
                        </span>
                      )}
                    </div>

                    {reminder.detail && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{reminder.detail}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {reminder.is_active && (
                        <span className="font-medium text-indigo-600">
                          Next: {formatNextRemind(reminder.next_remind_at)}
                        </span>
                      )}
                      <span>{formatTriggerTiming(reminder)}</span>
                      <span>Timezone: {reminder.timezone || 'UTC'}</span>
                      {reminder.recurrence_end_date && (
                        <span>Until {formatDate(reminder.recurrence_end_date)}</span>
                      )}
                      {reminder.last_reminded_at && (
                        <span>Last sent: {formatDate(reminder.last_reminded_at)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleToggle(reminder.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title={reminder.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {reminder.is_active ? (
                        <BellSlashIcon className="h-5 w-5" />
                      ) : (
                        <BellIcon className="h-5 w-5" />
                      )}
                    </button>
                    <Link
                      to={`/reminders/${reminder.id}/edit`}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(reminder.id, reminder.title)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {reminders.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {reminders.filter(r => r.is_active).length}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {reminders.filter(r => r.recurrence_type === 'none').length}
              </div>
              <div className="text-sm text-gray-500">One-time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reminders.filter(r => r.recurrence_type !== 'none').length}
              </div>
              <div className="text-sm text-gray-500">Recurring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reminders.filter(r => r.completed_at).length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
