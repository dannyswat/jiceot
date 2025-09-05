import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { billTypeAPI, type BillType } from '../services/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function BillTypesPage() {
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includesStopped, setIncludesStopped] = useState(false);

  const loadBillTypes = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await billTypeAPI.list({ include_stopped: includesStopped });
      setBillTypes(response.bill_types);
    } catch (err) {
      console.error('Failed to load bill types:', err);
      setError('Failed to load bill types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBillTypes();
  }, [includesStopped]);

  const handleToggleBillType = async (id: number): Promise<void> => {
    try {
      await billTypeAPI.toggle(id);
      void loadBillTypes(); // Reload the list
    } catch (err) {
      console.error('Failed to toggle bill type:', err);
      setError('Failed to toggle bill type');
    }
  };

  const handleDeleteBillType = async (id: number, name: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await billTypeAPI.delete(id);
      void loadBillTypes(); // Reload the list
    } catch (err) {
      console.error('Failed to delete bill type:', err);
      setError('Failed to delete bill type');
    }
  };

  const formatCycle = (cycle: number): string => {
    if (cycle === 0) return 'One-time';
    if (cycle === 1) return 'Monthly';
    if (cycle === 3) return 'Quarterly';
    if (cycle === 6) return 'Semi-annually';
    if (cycle === 12) return 'Annually';
    return `Every ${cycle} months`;
  };

  const formatBillDay = (day: number): string => {
    if (day === 0) return 'No specific day';
    return `${day}${day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of month`;
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill Types</h1>
          <p className="text-gray-600">Manage your recurring bills and payment schedules</p>
        </div>
        <Link
          to="/bill-types/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Bill Type
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includesStopped}
              onChange={(e) => setIncludesStopped(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Include stopped bill types</span>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Bill Types List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {billTypes.length === 0 ? (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bill types</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first bill type.</p>
            <div className="mt-6">
              <Link
                to="/bill-types/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Bill Type
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {billTypes.map((billType) => (
              <div key={billType.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Icon/Color */}
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: billType.color || '#6366f1' }}
                    >
                      {billType.icon || billType.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Bill Type Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">{billType.name}</h3>
                        {billType.stopped && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Stopped
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 space-y-1">
                        <p>
                          <span className="font-medium">Cycle:</span> {formatCycle(billType.bill_cycle)}
                        </p>
                        <p>
                          <span className="font-medium">Due:</span> {formatBillDay(billType.bill_day)}
                        </p>
                        {billType.fixed_amount && (
                          <p>
                            <span className="font-medium">Fixed Amount:</span> ${billType.fixed_amount}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleBillType(billType.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title={billType.stopped ? 'Enable bill type' : 'Disable bill type'}
                    >
                      {billType.stopped ? (
                        <EyeIcon className="h-5 w-5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    <Link
                      to={`/bill-types/${billType.id}/edit`}
                      className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit bill type"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    
                    <button
                      onClick={() => handleDeleteBillType(billType.id, billType.name)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Delete bill type"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {billTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {billTypes.filter(bt => !bt.stopped).length}
              </div>
              <div className="text-sm text-gray-500">Active Bill Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {billTypes.filter(bt => bt.stopped).length}
              </div>
              <div className="text-sm text-gray-500">Stopped Bill Types</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {billTypes.filter(bt => bt.fixed_amount).length}
              </div>
              <div className="text-sm text-gray-500">With Fixed Amount</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
