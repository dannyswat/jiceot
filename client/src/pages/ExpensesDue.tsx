import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, type DueExpense } from '../services/api';
import MonthSelect from '../components/MonthSelect';
import YearSelect from '../components/YearSelect';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export default function ExpensesDue() {
  const navigate = useNavigate();
  const [dueExpenses, setDueExpenses] = useState<DueExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadDueExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await dashboardAPI.getDueExpenses(selectedYear, selectedMonth);
      setDueExpenses(response.due_expenses);
    } catch (err) {
      console.error('Failed to load due expenses:', err);
      setError('Failed to load due expenses');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDueExpenses();
  }, [loadDueExpenses]);

  const handleCreateExpense = (dueExpense: DueExpense) => {
    // Navigate to expense item form with pre-selected data and returnUrl
    const queryParams = new URLSearchParams({
      expense_type_id: dueExpense.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: dueExpense.fixed_amount || '',
      returnUrl: '/expenses/due'
    });
    
    navigate(`/expense-items/new?${queryParams.toString()}`);
  };

  const getStatusIcon = (status: string, hasCreated: boolean) => {
    if (hasCreated) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    
    switch (status) {
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'due_soon':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (dueExpense: DueExpense) => {
    if (dueExpense.has_current_expense) {
      const nextDueDate = new Date(dueExpense.next_due_date);
      const nextDueDateMonth = nextDueDate.getMonth() + 1;
      const nextDueDateYear = nextDueDate.getFullYear();
      const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
      
      if (!isNextDueDateInCurrentMonth) {
        return `Next due: ${formatDate(nextDueDate)}`;
      } else {
        return 'Created';
      }
    }
    
    if (dueExpense.days_until_due < 0) {
      return `Overdue by ${Math.abs(dueExpense.days_until_due)} days`;
    } else if (dueExpense.days_until_due === 0) {
      return 'Due today';
    } else if (dueExpense.days_until_due <= 7) {
      return `Due in ${dueExpense.days_until_due} days`;
    } else {
      return `Due in ${dueExpense.days_until_due} days`;
    }
  };

  const getStatusColor = (status: string, hasCreated: boolean) => {
    if (hasCreated) return 'text-green-600 bg-green-50 border-green-200';
    
    switch (status) {
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'due_soon':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: string) => {
    if (!amount || amount === '0.00') return 'Amount varies';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses Due</h1>
          <p className="text-gray-600">Track upcoming recurring expenses and create new expense items</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <YearSelect
            value={selectedYear}
            onChange={(year) => setSelectedYear(year as number)}
            yearRange={2}
          />

          <MonthSelect
            value={selectedMonth}
            onChange={(month) => setSelectedMonth(month as number)}
          />

          <div className="flex items-end">
            <button
              onClick={loadDueExpenses}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Overdue',
            count: dueExpenses.filter(e => e.status === 'overdue' && !e.has_current_expense).length,
            color: 'text-red-600',
            bg: 'bg-red-50'
          },
          {
            label: 'Due Soon',
            count: dueExpenses.filter(e => e.status === 'due_soon' && !e.has_current_expense).length,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50'
          },
          {
            label: 'Created',
            count: dueExpenses.filter(e => e.has_current_expense).length,
            color: 'text-green-600',
            bg: 'bg-green-50'
          },
          {
            label: 'Total Expenses',
            count: dueExpenses.length,
            color: 'text-gray-600',
            bg: 'bg-gray-50'
          }
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-lg p-4`}>
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {dueExpenses.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recurring expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No expense types with recurring settings are configured.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/expense-types')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Configure Expense Types
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dueExpenses.map((dueExpense) => (
              <div key={dueExpense.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    {/* Expense Type Info */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                        style={{ backgroundColor: dueExpense.color || '#6b7280' }}
                      >
                        {dueExpense.icon || dueExpense.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{dueExpense.name}</h3>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(dueExpense.next_due_date)}
                          {dueExpense.fixed_amount && dueExpense.fixed_amount !== '0.00' && ` • ${formatCurrency(dueExpense.fixed_amount)}`}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`inline-flex flex-1 sm:flex-none me-0 sm:me-2 items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${getStatusColor(dueExpense.status, dueExpense.has_current_expense)}`}>
                      {getStatusIcon(dueExpense.status, dueExpense.has_current_expense)}
                      <span className="inline">{getStatusText(dueExpense)}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center">
                    {dueExpense.has_current_expense ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          {(() => {
                            const nextDueDate = new Date(dueExpense.next_due_date);
                            const nextDueDateMonth = nextDueDate.getMonth() + 1;
                            const nextDueDateYear = nextDueDate.getFullYear();
                            const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
                            return isNextDueDateInCurrentMonth ? 'Created' : 'Not Due';
                          })()}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCreateExpense(dueExpense)}
                        className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                          dueExpense.status === 'overdue' 
                            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                            : dueExpense.status === 'due_soon'
                            ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                            : 'bg-blue-600 hover:bg-blue-700 focus:ring-indigo-500'
                        }`}
                      >
                        <CurrencyDollarIcon className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="whitespace-nowrap">Create Expense</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Last Expense Info */}
                {dueExpense.last_expense_year && dueExpense.last_expense_amount && (
                  <div className="mt-4 text-sm text-gray-500">
                    Last expense: ${dueExpense.last_expense_amount} ({dueExpense.last_expense_month}/{dueExpense.last_expense_year})
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
