import { useState, useEffect, useCallback } from 'react';
import { reportsAPI, type MonthlyReport, type YearlyReport } from '../services/api';
import MonthSelect from '../components/MonthSelect';
import YearSelect from '../components/YearSelect';
import { 
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const loadMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      const report = await reportsAPI.getMonthly(selectedYear, selectedMonth);
      setMonthlyData(report);
    } catch (err) {
      console.error('Failed to load monthly data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const loadYearlyData = useCallback(async () => {
    try {
      setLoading(true);
      const report = await reportsAPI.getYearly(selectedYear);
      setYearlyData(report);
    } catch (err) {
      console.error('Failed to load yearly data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      loadMonthlyData();
    } else {
      loadYearlyData();
    }
  }, [viewMode, loadMonthlyData, loadYearlyData]);

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
    if (viewMode !== 'monthly' || !monthlyData || !yearlyData) return null;

    const currentIndex = yearlyData.months.findIndex(data => data.month === selectedMonth);
    const previousIndex = currentIndex - 1;

    if (previousIndex < 0 || !yearlyData.months[previousIndex]) return null;

    const currentAmount = monthlyData.total_amount;
    const previousAmount = yearlyData.months[previousIndex].total_amount;
    const difference = currentAmount - previousAmount;
    const percentageChange = previousAmount > 0 ? (difference / previousAmount) * 100 : 0;

    return {
      difference,
      percentageChange,
      isIncrease: difference > 0,
    };
  };

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
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'yearly'
                ? 'bg-blue-600 text-white'
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
          <YearSelect
            value={selectedYear}
            onChange={(year) => setSelectedYear(year as number)}
            label="Year"
            yearRange={5}
          />

          {viewMode === 'monthly' && (
            <MonthSelect
              value={selectedMonth}
              onChange={(month) => setSelectedMonth(month as number)}
              label="Month"
            />
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
                  <p className="text-2xl font-bold text-gray-700">{formatAmount(monthlyData.total_amount)}</p>
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
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Unexplained Payment</h3>
                  <p className="text-2xl font-bold text-gray-700">
                    {formatAmount(monthlyData.unexplained_payment)}
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
                    {formatAmount(monthlyData.total_amount / new Date(selectedYear, selectedMonth, 0).getDate())}
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
                {Object.keys(monthlyData.expense_type_breakdown).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No expense items this month</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(monthlyData.expense_type_breakdown)
                      .sort(([,a], [,b]) => b.amount - a.amount)
                      .map(([typeName, item]) => {
                        const percentage = monthlyData.total_amount > 0 ? (item.amount / monthlyData.total_amount) * 100 : 0;
                        return (
                          <div key={typeName} className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs mr-3"
                                style={{ backgroundColor: item.color }}
                              >
                                {item.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">{typeName}</span>
                                  <span className="text-sm text-gray-600">{item.count} items</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: item.color,
                                      width: `${percentage}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-sm font-medium text-gray-900">{formatAmount(item.amount)}</div>
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
                {Object.keys(monthlyData.bill_type_breakdown).length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No bill payments this month</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(monthlyData.bill_type_breakdown)
                      .sort(([,a], [,b]) => b.amount - a.amount)
                      .map(([typeName, item]) => {
                        const percentage = monthlyData.total_amount > 0 ? (item.amount / monthlyData.total_amount) * 100 : 0;
                        return (
                          <div key={typeName} className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <div 
                                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs mr-3"
                                style={{ backgroundColor: item.color }}
                              >
                                {item.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">{typeName}</span>
                                  <span className="text-sm text-gray-600">{item.count} bills</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full"
                                    style={{ 
                                      backgroundColor: item.color,
                                      width: `${percentage}%`
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="ml-4 text-right">
                                <div className="text-sm font-medium text-gray-900">{formatAmount(item.amount)}</div>
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
      ) : viewMode === 'yearly' && yearlyData && yearlyData.months.length > 0 ? (
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
                    {formatAmount(yearlyData.summary.total_amount)}
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
                    {formatAmount(yearlyData.summary.average_monthly)}
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
                      const highest = yearlyData.months.reduce((max, month) => 
                        month.total_amount > max.total_amount ? month : max
                      );
                      return `${getMonthAbbr(highest.month)} - ${formatAmount(highest.total_amount)}`;
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
                      const lowest = yearlyData.months.reduce((min, month) => 
                        month.total_amount < min.total_amount ? month : min
                      );
                      return `${getMonthAbbr(lowest.month)} - ${formatAmount(lowest.total_amount)}`;
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
                {yearlyData.months.map((monthData) => {
                  const maxAmount = Math.max(...yearlyData.months.map(d => d.total_amount));
                  const widthPercentage = maxAmount > 0 ? (monthData.total_amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div key={monthData.month} className="flex items-center">
                      <div className="w-16 text-right text-sm font-medium text-gray-700 mr-4">
                        {getMonthAbbr(monthData.month)}
                      </div>
                      <div className="flex-1 relative">
                        <div className="w-full bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className="h-8 bg-blue-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                            style={{ width: `${widthPercentage}%` }}
                          >
                            {monthData.total_amount > 0 && (
                              <span className="text-white text-xs font-medium">
                                {formatAmount(monthData.total_amount)}
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
