import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { billPaymentAPI, billTypeAPI, type CreateBillPaymentRequest, type UpdateBillPaymentRequest, type BillType } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function BillPaymentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';

  const [formData, setFormData] = useState({
    bill_type_id: 0,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: '',
    note: '',
  });

  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Load bill types
  useEffect(() => {
    const loadBillTypes = async (): Promise<void> => {
      try {
        const response = await billTypeAPI.list();
        setBillTypes(response.bill_types.filter(bt => !bt.stopped));
        if (response.bill_types.length > 0 && !isEdit) {
          setFormData(prev => ({ ...prev, bill_type_id: response.bill_types[0]!.id }));
        }
      } catch (err) {
        console.error('Failed to load bill types:', err);
        setError('Failed to load bill types');
      }
    };

    void loadBillTypes();
  }, [isEdit]);

  // Load existing bill payment for editing
  useEffect(() => {
    if (isEdit && id) {
      const loadBillPayment = async (): Promise<void> => {
        try {
          setInitialLoading(true);
          const billPayment = await billPaymentAPI.get(parseInt(id));
          setFormData({
            bill_type_id: billPayment.bill_type_id,
            year: billPayment.year,
            month: billPayment.month,
            amount: billPayment.amount,
            note: billPayment.note,
          });
        } catch (err) {
          console.error('Failed to load bill payment:', err);
          setError('Failed to load bill payment');
        } finally {
          setInitialLoading(false);
        }
      };

      void loadBillPayment();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.bill_type_id || !formData.amount) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isEdit && id) {
        const updateData: UpdateBillPaymentRequest = {
          amount: formData.amount,
          note: formData.note,
        };
        await billPaymentAPI.update(parseInt(id), updateData);
      } else {
        const createData: CreateBillPaymentRequest = {
          bill_type_id: formData.bill_type_id,
          year: formData.year,
          month: formData.month,
          amount: formData.amount,
          note: formData.note,
        };
        await billPaymentAPI.create(createData);
      }

      navigate('/bill-payments');
    } catch (err: unknown) {
      console.error('Failed to save bill payment:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save bill payment');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    
    // Handle numeric fields specifically (but keep amount as string)
    if (name === 'bill_type_id' || name === 'year' || name === 'month') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      // Keep amount and note as strings
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] ?? '';
  };

  const formatCurrency = (amount: string): string => {
    if (!amount) return '$0.00';
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  // Generate year options (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const selectedBillType = billTypes.find(bt => bt.id === formData.bill_type_id);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
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
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/bill-payments')}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Bill Payment' : 'Add New Bill Payment'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bill Type Selection */}
            <div>
              <label htmlFor="bill_type_id" className="block text-sm font-medium text-gray-700">
                Bill Type *
              </label>
              <select
                id="bill_type_id"
                name="bill_type_id"
                value={formData.bill_type_id}
                onChange={handleInputChange}
                disabled={isEdit} // Don't allow changing bill type when editing
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                required
              >
                <option value={0}>Select a bill type</option>
                {billTypes.map((billType) => (
                  <option key={billType.id} value={billType.id}>
                    {billType.name}
                  </option>
                ))}
              </select>
              {isEdit && (
                <p className="mt-1 text-xs text-gray-500">
                  Bill type cannot be changed when editing
                </p>
              )}
            </div>

            {/* Year and Month */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year *
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  disabled={isEdit} // Don't allow changing year when editing
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                  required
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                  Month *
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  disabled={isEdit} // Don't allow changing month when editing
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isEdit && (
              <p className="text-xs text-gray-500">
                Year and month cannot be changed when editing. Create a new payment for a different period.
              </p>
            )}

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount *
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the amount you paid for this bill
              </p>
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700">
                Note (Optional)
              </label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                placeholder="Add any additional notes about this payment..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/bill-payments')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          
          <div className="space-y-4">
            {selectedBillType && (
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedBillType.color || '#6b7280' }}
                ></div>
                <div>
                  <p className="font-medium text-gray-900">{selectedBillType.name}</p>
                  <p className="text-sm text-gray-500">
                    {getMonthName(formData.month)} {formData.year}
                  </p>
                </div>
              </div>
            )}
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(formData.amount)}
              </p>
            </div>
            
            {formData.note && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Note</p>
                <p className="text-sm text-gray-900">{formData.note}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
