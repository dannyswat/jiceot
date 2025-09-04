import { useState, useEffect } from 'react';
import { expenseItemAPI, billPaymentAPI, expenseTypeAPI, billTypeAPI, type ExpenseItem, type BillPayment, type ExpenseType, type BillType } from '../services/api';
import { 
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface MonthlyExpense {
  year: number;
  month: number;
  totalAmount: number;
  expenseItems: ExpenseItem[];
  billPayments: BillPayment[];
  expenseTypeBreakdown: { [key: string]: { amount: number; count: number; color: string; icon: string } };
  billTypeBreakdown: { [key: string]: { amount: number; count: number; color: string; icon: string } };
}

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthlyExpense | null>(null);
  const [yearlyData, setYearlyData] = useState<MonthlyExpense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadExpenseTypes();
    loadBillTypes();
  }, []);

  useEffect(() => {
    if (viewMode === 'monthly') {
      loadMonthlyData();
    } else {
      loadYearlyData();
    }
  }, [selectedYear, selectedMonth, viewMode, expenseTypes, billTypes]);

  const loadExpenseTypes = async () => {
    try {
      const response = await expenseTypeAPI.list();
      setExpenseTypes(response.expense_types);
    } catch (err) {
      console.error('Failed to load expense types:', err);
    }
  };

  const loadBillTypes = async () => {
    try {
      const response = await billTypeAPI.list();
      setBillTypes(response.bill_types);
    } catch (err) {
      console.error('Failed to load bill types:', err);
    }
  };

  const loadMonthlyData = async () => {
    if (expenseTypes.length === 0 || billTypes.length === 0) return;

    try {
      setLoading(true);
      
      const [expenseItemsResponse, billPaymentsResponse] = await Promise.all([
        expenseItemAPI.list({ year: selectedYear, month: selectedMonth }),
        billPaymentAPI.list({ year: selectedYear, month: selectedMonth }),
      ]);

      const monthlyExpense = processMonthlyData(
        selectedYear,
        selectedMonth,
        expenseItemsResponse.expense_items,
        billPaymentsResponse.bill_payments
      );

      setMonthlyData(monthlyExpense);
    } catch (err) {
      console.error('Failed to load monthly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadYearlyData = async () => {
    if (expenseTypes.length === 0 || billTypes.length === 0) return;

    try {
      setLoading(true);
      
      const yearlyPromises = Array.from({ length: 12 }, async (_, index) => {
        const month = index + 1;
        const [expenseItemsResponse, billPaymentsResponse] = await Promise.all([
          expenseItemAPI.list({ year: selectedYear, month }),
          billPaymentAPI.list({ year: selectedYear, month }),
        ]);

        return processMonthlyData(
          selectedYear,
          month,
          expenseItemsResponse.expense_items,
          billPaymentsResponse.bill_payments
        );
      });

      const yearlyResults = await Promise.all(yearlyPromises);
      setYearlyData(yearlyResults);
    } catch (err) {
      console.error('Failed to load yearly data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (
    year: number,
    month: number,
    expenseItems: ExpenseItem[],
    billPayments: BillPayment[]
  ): MonthlyExpense => {
    const expenseTypeBreakdown: { [key: string]: { amount: number; count: number; color: string; icon: string } } = {};
    const billTypeBreakdown: { [key: string]: { amount: number; count: number; color: string; icon: string } } = {};

    // Process expense items
    expenseItems.forEach(item => {
      const expenseType = expenseTypes.find(et => et.id === item.expense_type_id);
      const typeName = expenseType?.name || 'Unknown';
      const amount = parseFloat(item.amount);

      if (!expenseTypeBreakdown[typeName]) {
        expenseTypeBreakdown[typeName] = {
          amount: 0,
          count: 0,
          color: expenseType?.color || '#6B7280',
          icon: expenseType?.icon || '💰'
        };
      }

      expenseTypeBreakdown[typeName].amount += amount;
      expenseTypeBreakdown[typeName].count += 1;
    });

    // Process bill payments
    billPayments.forEach(payment => {
      const billType = billTypes.find(bt => bt.id === payment.bill_type_id);
      const typeName = billType?.name || 'Unknown';
      const amount = parseFloat(payment.amount);

      if (!billTypeBreakdown[typeName]) {
        billTypeBreakdown[typeName] = {
          amount: 0,
          count: 0,
          color: billType?.color || '#6B7280',
          icon: billType?.icon || '💳'
        };
      }

      billTypeBreakdown[typeName].amount += amount;
      billTypeBreakdown[typeName].count += 1;
    });

    const totalExpenseAmount = expenseItems.reduce((sum, item) => sum + (item.bill_payment_id ? 0 : parseFloat(item.amount)), 0);
    const totalBillAmount = billPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

    return {
      year,
      month,
      totalAmount: totalExpenseAmount + totalBillAmount,
      expenseItems,
      billPayments,
      expenseTypeBreakdown,
      billTypeBreakdown,
    };
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthAbbr = (month: number) => {
    return new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'short' });
  };

  const getPreviousMonthComparison = () => {
    if (viewMode !== 'monthly' || !monthlyData) return null;

    const currentIndex = yearlyData.findIndex(data => data.month === selectedMonth);
    const previousIndex = currentIndex - 1;

    if (previousIndex < 0 || !yearlyData[previousIndex]) return null;

    const currentAmount = monthlyData.totalAmount;
    const previousAmount = yearlyData[previousIndex].totalAmount;
    const difference = currentAmount - previousAmount;
    const percentageChange = previousAmount > 0 ? (difference / previousAmount) * 100 : 0;

    return {
      difference,
      percentageChange,
      isIncrease: difference > 0,
    };
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

  const comparison = getPreviousMonthComparison();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Reports</h1>
          <p className="text-gray-600">Analyze your spending patterns and trends</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'monthly'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'yearly'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {viewMode === 'monthly' && (
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
          )}
        </div>
      </div>

      {viewMode === 'monthly' && monthlyData ? (
        <div className="space-y-6">
          {/* Monthly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Total Expenses</h3>
                  <p className="text-2xl font-bold text-gray-700">{formatAmount(monthlyData.totalAmount)}</p>
                  {comparison && (
                    <div className={`flex items-center mt-1 ${comparison.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                      {comparison.isIncrease ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      )}
                      <span className="text-xs">
                        {Math.abs(comparison.percentageChange).toFixed(1)}% vs last month
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Total Transactions</h3>
                  <p className="text-2xl font-bold text-gray-700">
                    {monthlyData.expenseItems.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Average per Day</h3>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatAmount(monthlyData.totalAmount / new Date(selectedYear, selectedMonth, 0).getDate())}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Types Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Expense Types</h3>
              </div>
              <div className="p-6">
                {Object.keys(monthlyData.expenseTypeBreakdown).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No expense items this month</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(monthlyData.expenseTypeBreakdown)
                      .sort(([,a], [,b]) => b.amount - a.amount)
                      .map(([typeName, data]) => {
                        const percentage = (data.amount / monthlyData.totalAmount) * 100;
                        return (
                          <div key={typeName} className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs mr-3"
                                style={{ backgroundColor: data.color }}
                              >
                                {data.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">{typeName}</span>
                                  <span className="text-sm text-gray-600">{data.count} items</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: data.color,
                                      width: `${percentage}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-sm font-medium text-gray-900">{formatAmount(data.amount)}</div>
                                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Bill Types Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Bill Types</h3>
              </div>
              <div className="p-6">
                {Object.keys(monthlyData.billTypeBreakdown).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bill payments this month</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(monthlyData.billTypeBreakdown)
                      .sort(([,a], [,b]) => b.amount - a.amount)
                      .map(([typeName, data]) => {
                        const percentage = (data.amount / monthlyData.totalAmount) * 100;
                        return (
                          <div key={typeName} className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs mr-3"
                                style={{ backgroundColor: data.color }}
                              >
                                {data.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">{typeName}</span>
                                  <span className="text-sm text-gray-600">{data.count} bills</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: data.color,
                                      width: `${percentage}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-sm font-medium text-gray-900">{formatAmount(data.amount)}</div>
                                <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'yearly' && yearlyData.length > 0 ? (
        <div className="space-y-6">
          {/* Yearly Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Total Year</h3>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatAmount(yearlyData.reduce((sum, month) => sum + month.totalAmount, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Monthly Average</h3>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatAmount(yearlyData.reduce((sum, month) => sum + month.totalAmount, 0) / 12)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Highest Month</h3>
                  <p className="text-lg font-bold text-gray-700">
                    {(() => {
                      const highest = yearlyData.reduce((max, month) => 
                        month.totalAmount > max.totalAmount ? month : max
                      );
                      return `${getMonthAbbr(highest.month)} - ${formatAmount(highest.totalAmount)}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <ArrowTrendingDownIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Lowest Month</h3>
                  <p className="text-lg font-bold text-gray-700">
                    {(() => {
                      const lowest = yearlyData.reduce((min, month) => 
                        month.totalAmount < min.totalAmount ? month : min
                      );
                      return `${getMonthAbbr(lowest.month)} - ${formatAmount(lowest.totalAmount)}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Yearly Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Monthly Expenses - {selectedYear}</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {yearlyData.map((monthData) => {
                  const maxAmount = Math.max(...yearlyData.map(d => d.totalAmount));
                  const widthPercentage = maxAmount > 0 ? (monthData.totalAmount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={monthData.month} className="flex items-center">
                      <div className="w-16 text-right text-sm font-medium text-gray-700 mr-4">
                        {getMonthAbbr(monthData.month)}
                      </div>
                      <div className="flex-1 relative">
                        <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className="h-8 bg-indigo-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                            style={{ width: `${widthPercentage}%` }}
                          >
                            {monthData.totalAmount > 0 && (
                              <span className="text-white text-xs font-medium">
                                {formatAmount(monthData.totalAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">No expense data found for the selected period.</p>
        </div>
      )}
    </div>
  );
}
