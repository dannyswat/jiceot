import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, type DueBill } from '../services/api';
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

export default function BillPaymentDue() {
  const navigate = useNavigate();
  const [dueBills, setDueBills] = useState<DueBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadDueBills = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await dashboardAPI.getDueBills(selectedYear, selectedMonth);
      setDueBills(response.due_bills);
    } catch (err) {
      console.error('Failed to load due bills:', err);
      setError('Failed to load due bills');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadDueBills();
  }, [loadDueBills]);

  const handleCreatePayment = (dueBill: DueBill) => {
    // Navigate to bill payment form with pre-selected data and returnUrl
    const queryParams = new URLSearchParams({
      bill_type_id: dueBill.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: dueBill.fixed_amount || '',
      returnUrl: '/bill-payments/due'
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
  };

  const handleMarkAsSettled = (dueBill: DueBill) => {
    // Navigate to bill payment form with zero amount (settled without payment) and returnUrl
    const queryParams = new URLSearchParams({
      bill_type_id: dueBill.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: '0',
      returnUrl: '/bill-payments/due'
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
  };

  const getStatusIcon = (status: string, hasPaid: boolean) => {
    if (hasPaid) {
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

  const getStatusText = (dueBill: DueBill) => {
    if (dueBill.has_current_payment) {
      const nextDueDate = new Date(dueBill.next_due_date);
      const nextDueDateMonth = nextDueDate.getMonth() + 1;
      const nextDueDateYear = nextDueDate.getFullYear();
      const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
      
      if (!isNextDueDateInCurrentMonth) {
        return `Next due: ${formatDate(nextDueDate)}`;
      } else {
        return 'Paid';
      }
    }
    
    if (dueBill.days_until_due < 0) {
      return `Overdue by ${Math.abs(dueBill.days_until_due)} days`;
    } else if (dueBill.days_until_due === 0) {
      return 'Due today';
    } else if (dueBill.days_until_due <= 7) {
      return `Due in ${dueBill.days_until_due} days`;
    } else {
      return `Due in ${dueBill.days_until_due} days`;
    }
  };

  const getStatusColor = (status: string, hasPaid: boolean) => {
    if (hasPaid) return 'text-green-600 bg-green-50 border-green-200';
    
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
    if (!amount) return 'Amount varies';
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
          <h1 className="text-2xl font-bold text-gray-900">Bills Due</h1>
          <p className="text-gray-600">Track upcoming bill payments and create new payments</p>
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
              onClick={loadDueBills}
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
            count: dueBills.filter(b => b.status === 'overdue' && !b.has_current_payment).length,
            color: 'text-red-600',
            bg: 'bg-red-50'
          },
          {
            label: 'Due Soon',
            count: dueBills.filter(b => b.status === 'due_soon' && !b.has_current_payment).length,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50'
          },
          {
            label: 'Paid',
            count: dueBills.filter(b => b.has_current_payment).length,
            color: 'text-green-600',
            bg: 'bg-green-50'
          },
          {
            label: 'Total Bills',
            count: dueBills.length,
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

      {/* Bills List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {dueBills.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bills found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No bill types are configured for the selected period.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/bill-types')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                New Bill
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {dueBills.map((dueBill) => (
              <div key={dueBill.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    {/* Bill Type Info */}
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
                        style={{ backgroundColor: dueBill.color || '#6b7280' }}
                      >
                        {dueBill.icon || dueBill.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{dueBill.name}</h3>
                        <p className="text-sm text-gray-500">
                          Due: {formatDate(dueBill.next_due_date)}
                          {dueBill.fixed_amount && ` • ${formatCurrency(dueBill.fixed_amount)}`}
                        </p>
                      </div>
                    </div>

                    {/* Status - shown inline on mobile, separate on desktop */}
                    <div className={`inline-flex flex-1 sm:flex-none me-0 sm:me-2 items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${getStatusColor(dueBill.status, dueBill.has_current_payment)}`}>
                      {getStatusIcon(dueBill.status, dueBill.has_current_payment)}
                      <span className="inline">{getStatusText(dueBill)}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center">
                    {dueBill.has_current_payment ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">
                          {(() => {
                            const nextDueDate = new Date(dueBill.next_due_date);
                            const nextDueDateMonth = nextDueDate.getMonth() + 1;
                            const nextDueDateYear = nextDueDate.getFullYear();
                            const isNextDueDateInCurrentMonth = nextDueDateMonth === selectedMonth && nextDueDateYear === selectedYear;
                            return isNextDueDateInCurrentMonth ? 'Paid' : 'Not Due';
                          })()}
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleCreatePayment(dueBill)}
                          className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                            dueBill.status === 'overdue' 
                              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                              : dueBill.status === 'due_soon'
                              ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                              : 'bg-blue-600 hover:bg-blue-700 focus:ring-indigo-500'
                          }`}
                        >
                          <CurrencyDollarIcon className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="whitespace-nowrap">Pay Now</span>
                        </button>
                        
                        <button
                          onClick={() => handleMarkAsSettled(dueBill)}
                          className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                          title="Mark as settled without payment"
                        >
                          <CheckCircleIcon className="-ml-1 mr-2 h-4 w-4" />
                          <span className="whitespace-nowrap">Settled</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Last Payment Info */}
                {dueBill.last_payment_year && dueBill.last_payment_amount && (
                  <div className="mt-4 text-sm text-gray-500">
                    Last payment: ${dueBill.last_payment_amount} ({dueBill.last_payment_month}/{dueBill.last_payment_year})
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
