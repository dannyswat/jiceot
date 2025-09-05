import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { expenseTypeAPI, type ExpenseType } from '../services/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function ExpenseTypesPage() {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExpenseTypes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await expenseTypeAPI.list();
      setExpenseTypes(response.expense_types);
    } catch (err) {
      console.error('Failed to load expense types:', err);
      setError('Failed to load expense types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenseTypes();
  }, []);

  const handleDeleteExpenseType = async (id: number, name: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await expenseTypeAPI.delete(id);
      void loadExpenseTypes(); // Reload the list
    } catch (err) {
      console.error('Failed to delete expense type:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete expense type');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Types</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Types</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your expense categories and customize their appearance
          </p>
        </div>
        <Link
          to="/expense-types/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Expense Type
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-2">
          <TagIcon className="h-5 w-5 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">
            Total Expense Types: {expenseTypes.length}
          </span>
        </div>
      </div>

      {/* Expense Types Grid */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {expenseTypes.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expense types</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first expense type.
            </p>
            <div className="mt-6">
              <Link
                to="/expense-types/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Expense Type
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
            {expenseTypes.map((expenseType) => (
              <div key={expenseType.id} className="relative group">
                <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Color indicator and icon */}
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: expenseType.color || '#6b7280' }}
                    >
                      {expenseType.icon || expenseType.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {expenseType.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {expenseType.color || 'No color set'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-400">
                      Created {new Date(expenseType.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/expense-types/${expenseType.id}/edit`}
                        className="p-1 text-indigo-600 hover:text-indigo-900"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteExpenseType(expenseType.id, expenseType.name)}
                        className="p-1 text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Preview */}
      {expenseTypes.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Preview</h3>
          <div className="flex flex-wrap gap-2">
            {expenseTypes.slice(0, 6).map((expenseType) => (
              <div
                key={expenseType.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                style={{ 
                  backgroundColor: expenseType.color ? `${expenseType.color}20` : '#f3f4f6',
                  borderColor: expenseType.color || '#d1d5db',
                  color: expenseType.color || '#6b7280'
                }}
              >
                {expenseType.icon && <span className="mr-1">{expenseType.icon}</span>}
                {expenseType.name}
              </div>
            ))}
            {expenseTypes.length > 6 && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-gray-500 border border-gray-300">
                +{expenseTypes.length - 6} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
