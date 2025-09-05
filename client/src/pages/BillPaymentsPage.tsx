import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { billPaymentAPI, billTypeAPI, type BillPayment, type BillPaymentParams, type BillType } from '../services/api';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function BillPaymentsPage() {
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [filterBillType, setFilterBillType] = useState<number | ''>('');
  const [filterYear, setFilterYear] = useState<number | ''>(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | ''>('');

  const loadBillPayments = async (): Promise<void> => {
    try {
      setLoading(true);
      const params: BillPaymentParams = {};
      if (filterBillType) params.bill_type_id = filterBillType;
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;
      
      const response = await billPaymentAPI.list(params);
      setBillPayments(response.bill_payments);
    } catch (err) {
      console.error('Failed to load bill payments:', err);
      setError('Failed to load bill payments');
    } finally {
      setLoading(false);
    }
  };

  const loadBillTypes = async (): Promise<void> => {
    try {
      const response = await billTypeAPI.list();
      setBillTypes(response.bill_types);
    } catch (err) {
      console.error('Failed to load bill types:', err);
    }
  };

  useEffect(() => {
    void loadBillTypes();
  }, []);

  useEffect(() => {
    void loadBillPayments();
  }, [filterBillType, filterYear, filterMonth]);

  const handleDeleteBillPayment = async (id: number, note: string): Promise<void> => {
    if (!window.confirm(`Are you sure you want to delete this payment${note ? ` "${note}"` : ''}? This action cannot be undone.`)) {
      return;
    }

    try {
      await billPaymentAPI.delete(id);
      void loadBillPayments(); // Reload the list
    } catch (err) {
      console.error('Failed to delete bill payment:', err);
      setError('Failed to delete bill payment');
    }
  };

  const formatCurrency = (amount: string): string => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] ?? '';
  };

  const totalAmount = billPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Bill Payments</h1>
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
        <h1 className="text-2xl font-bold text-gray-900">Bill Payments</h1>
        <Link
          to="/bill-payments/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          Add Payment
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
          
          <select
            value={filterBillType}
            onChange={(e) => setFilterBillType(e.target.value ? parseInt(e.target.value) : '')}
            className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Bill Types</option>
            {billTypes.map((billType) => (
              <option key={billType.id} value={billType.id}>
                {billType.name}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : '')}
            className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Years</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : '')}
            className="rounded-md border-gray-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Total Amount ({billPayments.length} payment{billPayments.length !== 1 ? 's' : ''}):
            </span>
          </div>
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(totalAmount.toString())}
          </span>
        </div>
      </div>

      {/* Bill Payments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {billPayments.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bill payments</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a new bill payment.
            </p>
            <div className="mt-6">
              <Link
                to="/bill-payments/new"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Payment
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {billPayments.map((payment) => (
              <li key={payment.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {payment.bill_type && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: payment.bill_type.color || '#6b7280' }}
                        ></div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {payment.bill_type?.name || 'Unknown Bill Type'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getMonthName(payment.month)} {payment.year}
                          {payment.note && ` • ${payment.note}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {parseFloat(payment.amount) === 0 ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-green-600">
                            Settled
                          </span>
                          <span className="text-sm text-gray-500 bg-green-100 px-2 py-1 rounded-full">
                            $0
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </span>
                      )}
                      
                      <div className="flex space-x-2">
                        <Link
                          to={`/bill-payments/${payment.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBillPayment(payment.id, payment.note)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
