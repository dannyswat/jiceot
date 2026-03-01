import { type ReactNode, useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI, reminderAPI, type DueBill, type DueExpense, type Reminder } from '../services/api';
import QuickAddButton from './QuickAddButton';
import {
  HomeIcon,
  BanknotesIcon,
  CreditCardIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  RectangleGroupIcon,
  ReceiptPercentIcon,
  ArrowRightStartOnRectangleIcon,
  BellIcon,
  BellAlertIcon,
  UserCircleIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const [dueBills, setDueBills] = useState<DueBill[]>([]);
  const [dueExpenses, setDueExpenses] = useState<DueExpense[]>([]);
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  // Check if current path is a form page (new or edit)
  const isFormPage = location.pathname.includes('/new') || /\/\d+$/.test(location.pathname);

  // Redirect to login if not authenticated (but only after loading is complete)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Fetch due items and today's reminders
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [billsRes, expensesRes, remindersRes] = await Promise.all([
        dashboardAPI.getDueBills(year, month),
        dashboardAPI.getDueExpenses(year, month),
        reminderAPI.list({ limit: 50 }),
      ]);

      // Bills that are overdue or due soon (within 3 days)
      const urgentBills = (billsRes.due_bills ?? []).filter(
        b => b.status === 'overdue' || b.status === 'due_soon'
      );
      setDueBills(urgentBills);

      // Expenses that are overdue or due soon
      const urgentExpenses = (expensesRes.due_expenses ?? []).filter(
        e => e.status === 'overdue' || e.status === 'due_soon'
      );
      setDueExpenses(urgentExpenses);

      // Reminders due today (next_remind_at is today or past and still active)
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const activeReminders = (remindersRes.reminders ?? []).filter(r => {
        if (!r.is_active || r.completed_at) return false;
        const next = new Date(r.next_remind_at);
        return next < todayEnd;
      });
      setTodayReminders(activeReminders);
    } catch {
      // Silently fail – notifications are best-effort
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications, location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifCount = dueBills.length + dueExpenses.length + todayReminders.length;

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Due Items', href: '/due-items', icon: ClockIcon },
    { name: 'Bill Payments', href: '/bill-payments', icon: BanknotesIcon },
    { name: 'Expenses', href: '/expense-items', icon: ReceiptPercentIcon },
    { name: 'Expense Types', href: '/expense-types', icon: RectangleGroupIcon },
    { name: 'Bill Types', href: '/bill-types', icon: CreditCardIcon },
    { name: 'Reminders', href: '/reminders', icon: BellAlertIcon },
    { name: 'Reports', href: '/reports', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:transform-none ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <img src="/jiceot.svg" alt="Jiceot, a simple personal expenses management system" className="h-8 w-auto" />
          {/* Mobile close button */}
          <button
            className="lg:hidden p-2 text-gray-400 hover:text-gray-500"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className="flex items-center rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu when navigating
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                className="lg:hidden p-2 text-gray-400 hover:text-gray-500 mr-2"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <img src="/jiceot.svg" alt="Jiceot" className="h-8 w-auto lg:hidden" />
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div ref={notifRef} className="relative">
                <button
                  className="p-2 text-gray-400 hover:text-gray-500 relative"
                  onClick={() => setNotifOpen(prev => !prev)}
                >
                  {notifCount > 0 ? (
                    <BellAlertIcon className="h-5 w-5 text-orange-500" />
                  ) : (
                    <BellIcon className="h-5 w-5" />
                  )}
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>

                    {notifCount === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        No due items or reminders today
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {dueBills.map(bill => (
                          <li key={`bill-${bill.id}`}>
                            <Link
                              to="/due-items"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm" style={{ backgroundColor: `${bill.color}20`, color: bill.color }}>
                                {bill.icon || '💳'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{bill.name}</p>
                                <p className="text-xs text-gray-500">
                                  {bill.status === 'overdue' ? (
                                    <span className="text-red-600 font-medium">Overdue</span>
                                  ) : (
                                    <span className="text-orange-600">Due in {bill.days_until_due} day{bill.days_until_due !== 1 ? 's' : ''}</span>
                                  )}
                                  {' · Bill'}
                                </p>
                              </div>
                              {bill.status === 'overdue' && (
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              )}
                            </Link>
                          </li>
                        ))}

                        {dueExpenses.map(expense => (
                          <li key={`expense-${expense.id}`}>
                            <Link
                              to="/due-items"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm" style={{ backgroundColor: `${expense.color}20`, color: expense.color }}>
                                {expense.icon || '📦'}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{expense.name}</p>
                                <p className="text-xs text-gray-500">
                                  {expense.status === 'overdue' ? (
                                    <span className="text-red-600 font-medium">Overdue</span>
                                  ) : (
                                    <span className="text-orange-600">Due in {expense.days_until_due} day{expense.days_until_due !== 1 ? 's' : ''}</span>
                                  )}
                                  {' · Expense'}
                                </p>
                              </div>
                              {expense.status === 'overdue' && (
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                              )}
                            </Link>
                          </li>
                        ))}

                        {todayReminders.map(reminder => (
                          <li key={`reminder-${reminder.id}`}>
                            <Link
                              to="/reminders"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm">
                                🔔
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">{reminder.title}</p>
                                <p className="text-xs text-gray-500">
                                  Reminder · {new Date(reminder.next_remind_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                        onClick={() => setNotifOpen(false)}
                        className="block px-4 py-2.5 text-center text-xs font-medium text-blue-600 hover:bg-gray-50 transition-colors"
                      >
                        View all due items
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              
              {/* User menu */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-500"
                  title="Logout"
                >
                  <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Quick Add Floating Button - Hide on form pages */}
      {!isFormPage && <QuickAddButton />}
    </div>
  );
};
