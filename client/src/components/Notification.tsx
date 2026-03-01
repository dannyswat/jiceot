import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BellAlertIcon,
  BellIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  dashboardAPI,
  reminderAPI,
  type DueBill,
  type DueExpense,
  type Reminder,
} from '../services/api';

export default function Notification() {
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [dueBills, setDueBills] = useState<DueBill[]>([]);
  const [dueExpenses, setDueExpenses] = useState<DueExpense[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [billsRes, expensesRes, remindersRes] = await Promise.all([
        dashboardAPI.getDueBills(year, month),
        dashboardAPI.getDueExpenses(year, month),
        reminderAPI.list({ limit: 50 }),
      ]);

      const urgentBills = (billsRes.due_bills ?? []).filter(
        (bill) => bill.status === 'overdue' || bill.status === 'due_soon'
      );
      setDueBills(urgentBills);

      const urgentExpenses = (expensesRes.due_expenses ?? []).filter(
        (expense) => expense.status === 'overdue' || expense.status === 'due_soon'
      );
      setDueExpenses(urgentExpenses);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const activeReminders = (remindersRes.reminders ?? []).filter((reminder) => {
        if (!reminder.is_active || reminder.completed_at) return false;
        const next = new Date(reminder.next_remind_at);
        return next < todayEnd;
      });
      setTodayReminders(activeReminders);
    } catch {
      // Best-effort UI data only
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notificationCount = dueBills.length + dueExpenses.length + todayReminders.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        className="relative p-2 text-gray-400 hover:text-gray-500"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        {notificationCount > 0 ? (
          <BellAlertIcon className="h-5 w-5 text-orange-500" />
        ) : (
          <BellIcon className="h-5 w-5" />
        )}

        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 max-h-96 w-80 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>

          {notificationCount === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              No due items or reminders today
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {dueBills.map((bill) => (
                <li key={`bill-${bill.id}`}>
                  <Link
                    to="/due-items"
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `${bill.color}20`, color: bill.color }}
                    >
                      {bill.icon || '💳'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{bill.name}</p>
                      <p className="text-xs text-gray-500">
                        {bill.status === 'overdue' ? (
                          <span className="font-medium text-red-600">Overdue</span>
                        ) : (
                          <span className="text-orange-600">
                            Due in {bill.days_until_due} day{bill.days_until_due !== 1 ? 's' : ''}
                          </span>
                        )}
                        {' · Bill'}
                      </p>
                    </div>
                    {bill.status === 'overdue' && (
                      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}
                  </Link>
                </li>
              ))}

              {dueExpenses.map((expense) => (
                <li key={`expense-${expense.id}`}>
                  <Link
                    to="/due-items"
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{ backgroundColor: `${expense.color}20`, color: expense.color }}
                    >
                      {expense.icon || '📦'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{expense.name}</p>
                      <p className="text-xs text-gray-500">
                        {expense.status === 'overdue' ? (
                          <span className="font-medium text-red-600">Overdue</span>
                        ) : (
                          <span className="text-orange-600">
                            Due in {expense.days_until_due} day{expense.days_until_due !== 1 ? 's' : ''}
                          </span>
                        )}
                        {' · Expense'}
                      </p>
                    </div>
                    {expense.status === 'overdue' && (
                      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}
                  </Link>
                </li>
              ))}

              {todayReminders.map((reminder) => (
                <li key={`reminder-${reminder.id}`}>
                  <Link
                    to="/reminders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm text-indigo-600">
                      🔔
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{reminder.title}</p>
                      <p className="text-xs text-gray-500">
                        Reminder ·{' '}
                        {new Date(reminder.next_remind_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100">
            <Link
              to="/due-items"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-center text-xs font-medium text-blue-600 transition-colors hover:bg-gray-50"
            >
              View all due items
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
