import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, type DueBill, type DueExpense } from '../services/api';
import MonthSelect from '../components/MonthSelect';
import YearSelect from '../components/YearSelect';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  BanknotesIcon,
  ReceiptPercentIcon
} from '@heroicons/react/24/outline';

type DueItem = (DueBill | DueExpense) & { 
  itemType: 'bill' | 'expense';
};

export default function DueItemsPage() {
  const navigate = useNavigate();
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filter, setFilter] = useState<'all' | 'bills' | 'expenses'>('all');

  const loadDueItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [billsResponse, expensesResponse] = await Promise.all([
        dashboardAPI.getDueBills(selectedYear, selectedMonth),
        dashboardAPI.getDueExpenses(selectedYear, selectedMonth)
      ]);

      const bills: DueItem[] = billsResponse.due_bills.map(bill => ({ 
        ...bill, 
        itemType: 'bill' as const 
      }));
      const expenses: DueItem[] = expensesResponse.due_expenses.map(expense => ({ 
        ...expense, 
        itemType: 'expense' as const 
      }));

      // Combine and sort by due date
      const combined = [...bills, ...expenses].sort((a, b) => {
        const dateA = new Date(a.next_due_date).getTime();
        const dateB = new Date(b.next_due_date).getTime();
        return dateA - dateB;
      });

      setDueItems(combined);
    } catch (err) {
      console.error('Failed to load due items:', err);
      setError('Failed to load due items');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDueItems();
  }, [loadDueItems]);

  const handleCreateBillPayment = (dueBill: DueBill) => {
    const queryParams = new URLSearchParams({
      bill_type_id: dueBill.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: dueBill.fixed_amount || '',
      returnUrl: '/due-items'
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
  };

  const handleMarkAsSettled = (dueBill: DueBill) => {
    const queryParams = new URLSearchParams({
      bill_type_id: dueBill.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: '0',
      returnUrl: '/due-items'
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
  };

  const handleCreateExpense = (dueExpense: DueExpense) => {
    const queryParams = new URLSearchParams({
      expense_type_id: dueExpense.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: dueExpense.fixed_amount || '',
      returnUrl: '/due-items'
    });
    
    navigate(`/expense-items/new?${queryParams.toString()}`);
  };

  const getStatusIcon = (status: string, hasCompleted: boolean) => {
    if (hasCompleted) {
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

  const getStatusText = (item: DueItem) => {
    const hasCompleted = item.itemType === 'bill' 
      ? (item as DueBill).has_current_payment 
      : (item as DueExpense).has_current_expense;

    if (hasCompleted) {
      const nextDueDate = new Date(item.next_due_date);
      const nextDueDateMonth = nextDueDate.getMonth() + 1;
      const nextDueDateYear = nextDueDate.getFullYear();
      const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
      
      if (!isNextDueDateInCurrentMonth) {
        return `Next due: ${formatDate(nextDueDate)}`;
      } else {
        return item.itemType === 'bill' ? 'Paid' : 'Created';
      }
    }
    
    if (item.days_until_due < 0) {
      return `Overdue by ${Math.abs(item.days_until_due)} days`;
    } else if (item.days_until_due === 0) {
      return 'Due today';
    } else if (item.days_until_due <= 7) {
      return `Due in ${item.days_until_due} days`;
    } else {
      return `Due in ${item.days_until_due} days`;
    }
  };

  const getStatusColor = (status: string, hasCompleted: boolean) => {
    if (hasCompleted) return 'text-green-600 bg-green-50 border-green-200';
    
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

  const filteredItems = filter === 'all' 
    ? dueItems 
    : dueItems.filter(item => item.itemType === filter.slice(0, -1) as 'bill' | 'expense');

  const bills = dueItems.filter(item => item.itemType === 'bill');
  const expenses = dueItems.filter(item => item.itemType === 'expense');

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
          <h1 className="text-2xl font-bold text-gray-900">Due Items</h1>
          <p className="text-gray-600">Manage all upcoming bills and expenses in one place</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <YearSelect
            value={selectedYear}
            onChange={(year) => setSelectedYear(year as number)}
            yearRange={2}
          />

          <MonthSelect
            value={selectedMonth}
            onChange={(month) => setSelectedMonth(month as number)}
          />

          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter
            </label>
            <select
              id="filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'bills' | 'expenses')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Items</option>
              <option value="bills">Bills Only</option>
              <option value="expenses">Expenses Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadDueItems}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          {
            label: 'Overdue',
            count: filteredItems.filter(item => {
              const hasCompleted = item.itemType === 'bill' 
                ? (item as DueBill).has_current_payment 
                : (item as DueExpense).has_current_expense;
              return item.status === 'overdue' && !hasCompleted;
            }).length,
            color: 'text-red-600',
            bg: 'bg-red-50'
          },
          {
            label: 'Due Soon',
            count: filteredItems.filter(item => {
              const hasCompleted = item.itemType === 'bill' 
                ? (item as DueBill).has_current_payment 
                : (item as DueExpense).has_current_expense;
              return item.status === 'due_soon' && !hasCompleted;
            }).length,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50'
          },
          {
            label: 'Completed',
            count: filteredItems.filter(item => {
              return item.itemType === 'bill' 
                ? (item as DueBill).has_current_payment 
                : (item as DueExpense).has_current_expense;
            }).length,
            color: 'text-green-600',
            bg: 'bg-green-50'
          },
          {
            label: 'Total Bills',
            count: bills.length,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
          },
          {
            label: 'Total Expenses',
            count: expenses.length,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
          },
          {
            label: 'All Items',
            count: dueItems.length,
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

      {/* Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No due items found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'bills' 
                ? 'No bill types are configured for the selected period.'
                : filter === 'expenses'
                ? 'No expense types with recurring settings are configured.'
                : 'No bills or expenses are due for the selected period.'}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => navigate('/bill-types')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Bill Type
              </button>
              <button
                onClick={() => navigate('/expense-types')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Expense Type
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => {
              const isBill = item.itemType === 'bill';
              const hasCompleted = isBill 
                ? (item as DueBill).has_current_payment 
                : (item as DueExpense).has_current_expense;

              return (
                <div key={`${item.itemType}-${item.id}`} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                      {/* Item Info */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                          style={{ backgroundColor: item.color || '#6b7280' }}
                        >
                          {item.icon || item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-900 truncate">{item.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              isBill ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {isBill ? (
                                <><BanknotesIcon className="h-3 w-3 mr-1" /> Bill</>
                              ) : (
                                <><ReceiptPercentIcon className="h-3 w-3 mr-1" /> Expense</>
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Due: {formatDate(item.next_due_date)}
                            {item.fixed_amount && item.fixed_amount !== '0.00' && ` • ${formatCurrency(item.fixed_amount)}`}
                          </p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className={`inline-flex flex-1 sm:flex-none me-0 sm:me-2 items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${getStatusColor(item.status, hasCompleted)}`}>
                        {getStatusIcon(item.status, hasCompleted)}
                        <span className="inline">{getStatusText(item)}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center">
                      {hasCompleted ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircleIcon className="h-5 w-5" />
                          <span className="text-sm font-medium">
                            {(() => {
                              const nextDueDate = new Date(item.next_due_date);
                              const nextDueDateMonth = nextDueDate.getMonth() + 1;
                              const nextDueDateYear = nextDueDate.getFullYear();
                              const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
                              return isNextDueDateInCurrentMonth ? (isBill ? 'Paid' : 'Created') : 'Not Due';
                            })()}
                          </span>
                        </div>
                      ) : isBill ? (
                        <div className="flex flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                          <button
                            onClick={() => handleCreateBillPayment(item as DueBill)}
                            className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                              item.status === 'overdue' 
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                : item.status === 'due_soon'
                                ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-indigo-500'
                            }`}
                          >
                            <CurrencyDollarIcon className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                            <span className="whitespace-nowrap">Pay Now</span>
                          </button>
                          
                          <button
                            onClick={() => handleMarkAsSettled(item as DueBill)}
                            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            title="Mark as settled without payment"
                          >
                            <CheckCircleIcon className="-ml-1 mr-2 h-4 w-4" />
                            <span className="whitespace-nowrap">Settled</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCreateExpense(item as DueExpense)}
                          className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                            item.status === 'overdue' 
                              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                              : item.status === 'due_soon'
                              ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                              : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                          }`}
                        >
                          <CurrencyDollarIcon className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="whitespace-nowrap">Create Expense</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Last Payment/Expense Info */}
                  {isBill ? (
                    (item as DueBill).last_payment_year && (item as DueBill).last_payment_amount && (
                      <div className="mt-4 text-sm text-gray-500">
                        Last payment: ${(item as DueBill).last_payment_amount} ({(item as DueBill).last_payment_month}/{(item as DueBill).last_payment_year})
                      </div>
                    )
                  ) : (
                    (item as DueExpense).last_expense_year && (item as DueExpense).last_expense_amount && (
                      <div className="mt-4 text-sm text-gray-500">
                        Last expense: ${(item as DueExpense).last_expense_amount} ({(item as DueExpense).last_expense_month}/{(item as DueExpense).last_expense_year})
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
