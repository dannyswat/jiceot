import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { expenseItemAPI, expenseTypeAPI, type ExpenseItem, type ExpenseType } from '../services/api';
import MonthSelect from '../components/MonthSelect';
import YearSelect from '../components/YearSelect';
import { getMonthName } from '../common/date';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function ExpenseItemsPage() {
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Filter states
  const [selectedExpenseType, setSelectedExpenseType] = useState<number | undefined>();
  const [selectedYear, setSelectedYear] = useState<number | ''>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | ''>(new Date().getMonth() + 1);
  const [unbilledOnly, setUnbilledOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadExpenseTypes = async () => {
    try {
      const response = await expenseTypeAPI.list();
      setExpenseTypes(response.expense_types);
    } catch (err) {
      console.error('Failed to load expense types:', err);
    }
  };

  const loadExpenseItems = useCallback(async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await expenseItemAPI.list({
        expense_type_id: selectedExpenseType,
        year: selectedYear === '' ? undefined : selectedYear,
        month: selectedMonth === '' ? undefined : selectedMonth,
        unbilled_only: unbilledOnly || undefined,
        limit: itemsPerPage,
        offset,
      });
      
      setExpenseItems(response.expense_items);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError('Failed to load expenses');
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedExpenseType, selectedYear, selectedMonth, unbilledOnly, currentPage]);

  useEffect(() => {
    loadExpenseTypes();
  }, []);

  useEffect(() => {
    loadExpenseItems();
  }, [loadExpenseItems]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense item?')) {
      return;
    }

    try {
      await expenseItemAPI.delete(id);
      loadExpenseItems();
    } catch (err) {
      console.error('Failed to delete expense item:', err);
      alert('Failed to delete expense item');
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const getExpenseType = (expenseItem: ExpenseItem) => {
    return expenseItem.expense_type || expenseTypes.find(et => et.id === expenseItem.expense_type_id);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  if (loading && expenseItems.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600">Track your individual expenses</p>
        </div>
        <Link
          to="/expense-items/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center min-w-[120px]"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Expense
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expense Type
            </label>
            <select
              value={selectedExpenseType || ''}
              onChange={(e) => setSelectedExpenseType(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </div>

          <YearSelect
            value={selectedYear}
            onChange={(year) => setSelectedYear(year)}
            label="Year"
            yearRange={5}
            includeAllOption={true}
          />

          <MonthSelect
            value={selectedMonth}
            onChange={(month) => setSelectedMonth(month)}
            label="Month"
            includeAllOption={true}
          />

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedExpenseType(undefined);
                setSelectedMonth('');
                setSelectedYear(new Date().getFullYear());
                setUnbilledOnly(false);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Unbilled Only Checkbox */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={unbilledOnly}
              onChange={(e) => {
                const checked = e.target.checked;
                setUnbilledOnly(checked);
                if (checked) {
                  // When checking, show all years and months
                  setSelectedYear('');
                  setSelectedMonth('');
                } else {
                  // When unchecking, reset to current year and month
                  setSelectedYear(new Date().getFullYear());
                  setSelectedMonth(new Date().getMonth() + 1);
                }
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Show unbilled expenses only
            </span>
          </label>
        </div>
      </div>

      {/* Statistics */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">
              {formatAmount(
                expenseItems.reduce((sum, item) => sum + parseFloat(item.amount), 0).toString()
              )}
            </div>
            <div className="text-sm text-gray-600">Current Page Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{expenseTypes.length}</div>
            <div className="text-sm text-gray-600">Expense Types</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Expense Items List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {expenseItems.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expense items found</h3>
            <p className="text-gray-600 mb-4">
              {selectedExpenseType || selectedMonth ? 
                'No expense items match your current filters.' : 
                'Start tracking your expenses by adding your first expense item.'
              }
            </p>
            <Link
              to="/expense-items/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add First Expense Item
            </Link>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {expenseItems.map((item) => {
                const expenseType = getExpenseType(item);
                return (
                  <li key={item.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {expenseType ? (
                            <span
                              className="text-lg w-6 text-center flex-shrink-0"
                              style={{ color: expenseType.color }}
                            >
                              {expenseType.icon}
                            </span>
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {expenseType?.name || 'Unknown Expense Type'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {getMonthName(item.month)} {item.year} created on {item.created_at.slice(0, 10)}
                              {item.note && ` • ${item.note}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <span className="text-lg font-semibold text-gray-900">
                            {formatAmount(item.amount)}
                          </span>
                          <div className="flex space-x-2">
                            <Link
                              to={`/expense-items/${item.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
