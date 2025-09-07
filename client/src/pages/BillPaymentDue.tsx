import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { billTypeAPI, billPaymentAPI, type BillType, type BillPayment } from '../services/api';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface DueBillType extends BillType {
  next_due_date: Date;
  days_until_due: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
  last_payment?: BillPayment;
  has_current_payment: boolean;
}

export default function BillPaymentDue() {
  const navigate = useNavigate();
  const [dueBills, setDueBills] = useState<DueBillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadDueBills();
  }, [selectedMonth, selectedYear]);

  const loadDueBills = async () => {
    try {
      setLoading(true);
      setError('');

      const [billTypesResponse, billPaymentsResponse] = await Promise.all([
        billTypeAPI.list(),
        billPaymentAPI.list({ year: selectedYear, month: selectedMonth })
      ]);

      const activeBillTypes = billTypesResponse.bill_types.filter(bt => !bt.stopped && bt.bill_cycle);
      const existingPayments = billPaymentsResponse.bill_payments;

      const dueBillsWithStatus: DueBillType[] = activeBillTypes.map(billType => {
        const nextDueDate = calculateNextDueDate(billType, selectedYear, selectedMonth);
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        
        const hasCurrentPayment = existingPayments.some(payment => 
          payment.bill_type_id === billType.id && 
          payment.year === selectedYear && 
          payment.month === selectedMonth
        );

        const lastPayment = existingPayments
          .filter(payment => payment.bill_type_id === billType.id)
          .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];

        let status: 'overdue' | 'due_soon' | 'upcoming';
        if (hasCurrentPayment) {
          status = 'upcoming'; // Paid bills are less urgent
        } else if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 7) {
          status = 'due_soon';
        } else {
          status = 'upcoming';
        }

        return {
          ...billType,
          next_due_date: nextDueDate,
          days_until_due: daysUntilDue,
          status,
          last_payment: lastPayment,
          has_current_payment: hasCurrentPayment
        };
      });

      // Sort by priority: overdue first, then due soon, then by due date
      dueBillsWithStatus.sort((a, b) => {
        const statusPriority = { overdue: 0, due_soon: 1, upcoming: 2 };
        if (statusPriority[a.status] !== statusPriority[b.status]) {
          return statusPriority[a.status] - statusPriority[b.status];
        }
        return a.next_due_date.getTime() - b.next_due_date.getTime();
      });

      setDueBills(dueBillsWithStatus);
    } catch (err) {
      console.error('Failed to load due bills:', err);
      setError('Failed to load due bills');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextDueDate = (billType: BillType, year: number, month: number): Date => {
    if (billType.bill_day === 0) {
      // No specific day, use end of month
      return new Date(year, month, 0); // Last day of the month
    }
    
    // Use the specific day
    const dueDate = new Date(year, month - 1, billType.bill_day);
    
    // If the due date has passed this month, move to next cycle
    if (dueDate < new Date() && month === new Date().getMonth() + 1 && year === new Date().getFullYear()) {
      if (billType.bill_cycle === 1) {
        // Monthly - next month
        return new Date(year, month, billType.bill_day);
      } else if (billType.bill_cycle === 3) {
        // Quarterly
        return new Date(year, month + 2, billType.bill_day);
      } else if (billType.bill_cycle === 6) {
        // Semi-annually
        return new Date(year, month + 5, billType.bill_day);
      } else if (billType.bill_cycle === 12) {
        // Annually
        return new Date(year + 1, month - 1, billType.bill_day);
      }
    }
    
    return dueDate;
  };

  const handleCreatePayment = (billType: BillType) => {
    // Navigate to bill payment form with pre-selected data
    const queryParams = new URLSearchParams({
      bill_type_id: billType.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: billType.fixed_amount || ''
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
  };

  const handleMarkAsSettled = (billType: BillType) => {
    // Navigate to bill payment form with zero amount (settled without payment)
    const queryParams = new URLSearchParams({
      bill_type_id: billType.id.toString(),
      year: selectedYear.toString(),
      month: selectedMonth.toString(),
      amount: '0'
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

  const getStatusText = (dueBill: DueBillType) => {
    if (dueBill.has_current_payment) {
      return 'Paid';
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const months = [
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

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i - 2);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

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
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium border flex-shrink-0 ${getStatusColor(dueBill.status, dueBill.has_current_payment)}`}>
                      {getStatusIcon(dueBill.status, dueBill.has_current_payment)}
                      <span className="inline">{getStatusText(dueBill)}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center">
                    {dueBill.has_current_payment ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span className="text-sm font-medium">Paid</span>
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
                {dueBill.last_payment && (
                  <div className="mt-4 text-sm text-gray-500">
                    Last payment: ${dueBill.last_payment.amount} on{' '}
                    {new Date(dueBill.last_payment.created_at).toLocaleDateString()}
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
