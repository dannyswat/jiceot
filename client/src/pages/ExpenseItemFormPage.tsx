import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expenseItemAPI, expenseTypeAPI, billPaymentAPI, type ExpenseType, type BillPayment, type CreateExpenseItemRequest, type UpdateExpenseItemRequest } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ExpenseItemFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<CreateExpenseItemRequest>({
    expense_type_id: 0,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    amount: '',
    note: '',
  });

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExpenseTypes();
    loadBillPayments();
    if (isEditing && id) {
      loadExpenseItem(Number(id));
    }
  }, [id, isEditing]);

  const loadExpenseTypes = async () => {
    try {
      const response = await expenseTypeAPI.list();
      setExpenseTypes(response.expense_types);
    } catch (err) {
      console.error('Failed to load expense types:', err);
    }
  };

  const loadBillPayments = async () => {
    try {
      const response = await billPaymentAPI.list();
      setBillPayments(response.bill_payments);
    } catch (err) {
      console.error('Failed to load bill payments:', err);
    }
  };

  const loadExpenseItem = async (expenseItemId: number) => {
    try {
      const item = await expenseItemAPI.get(expenseItemId);
      setFormData({
        bill_payment_id: item.bill_payment_id ?? 0,
        expense_type_id: item.expense_type_id,
        year: item.year,
        month: item.month,
        amount: item.amount,
        note: item.note,
      });
    } catch (err) {
      setError('Failed to load expense item');
      console.error('Failed to load expense item:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_type_id) {
      setError('Please select an expense type');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditing && id) {
        await expenseItemAPI.update(Number(id), formData as UpdateExpenseItemRequest);
      } else {
        await expenseItemAPI.create(formData);
      }

      navigate('/expense-items');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save expense item');
      console.error('Failed to save expense item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'expense_type_id' || name === 'bill_payment_id' || name === 'year' || name === 'month' 
        ? (value ? Number(value) : undefined) 
        : value
    }));
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

  const formatPreviewAmount = () => {
    if (!formData.amount) return '$0.00';
    const amount = parseFloat(formData.amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(isNaN(amount) ? 0 : amount);
  };

  const getSelectedExpenseType = () => {
    return expenseTypes.find(type => type.id === formData.expense_type_id);
  };

  const getSelectedBillPayment = () => {
    return billPayments.find(payment => payment.id === formData.bill_payment_id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/expense-items')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Expense Item' : 'Add Expense Item'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? 'Update your expense item details' : 'Track a new expense'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Expense Type */}
            <div>
              <label htmlFor="expense_type_id" className="block text-sm font-medium text-gray-700 mb-1">
                Expense Type *
              </label>
              <select
                id="expense_type_id"
                name="expense_type_id"
                value={formData.expense_type_id}
                onChange={handleInputChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select an expense type</option>
                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bill Payment (Optional) */}
            <div>
              <label htmlFor="bill_payment_id" className="block text-sm font-medium text-gray-700 mb-1">
                Related Bill Payment (Optional)
              </label>
              <select
                id="bill_payment_id"
                name="bill_payment_id"
                value={formData.bill_payment_id || ''}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No related bill payment</option>
                {billPayments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {payment.bill_type?.name} - ${payment.amount} ({payment.year}/{payment.month})
                  </option>
                ))}
              </select>
            </div>

            {/* Date - Year and Month */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <select
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i + 5).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                  Month *
                </label>
                <select
                  id="month"
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
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
                  required
                  className="w-full pl-7 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                Note
              </label>
              <textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                placeholder="Optional note about this expense..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/expense-items')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          
          <div className="space-y-4">
            {/* Expense Type Preview */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Expense Type:</span>
              <div className="flex items-center">
                {getSelectedExpenseType() ? (
                  <>
                    <span className="text-lg mr-2">{getSelectedExpenseType()?.icon}</span>
                    <span className="text-sm font-medium" style={{ color: getSelectedExpenseType()?.color }}>
                      {getSelectedExpenseType()?.name}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Not selected</span>
                )}
              </div>
            </div>

            {/* Date Preview */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Date:</span>
              <span className="text-sm text-gray-900">
                {new Date(formData.year, formData.month - 1).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long'
                })}
              </span>
            </div>

            {/* Amount Preview */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Amount:</span>
              <span className="text-lg font-bold text-indigo-600">
                {formatPreviewAmount()}
              </span>
            </div>

            {/* Bill Payment Preview */}
            {formData.bill_payment_id && getSelectedBillPayment() && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Related Bill:</span>
                <span className="text-sm text-gray-900">
                  {getSelectedBillPayment()?.bill_type?.name}
                </span>
              </div>
            )}

            {/* Note Preview */}
            {formData.note && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 block mb-1">Note:</span>
                <span className="text-sm text-gray-900">{formData.note}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
