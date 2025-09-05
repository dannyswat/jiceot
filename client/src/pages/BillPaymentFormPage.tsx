import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  billPaymentAPI, 
  billTypeAPI, 
  expenseTypeAPI,
  expenseItemAPI,
  type CreateBillPaymentRequest, 
  type UpdateBillPaymentRequest, 
  type BillType,
  type ExpenseType,
  type ExpenseItem,
  type CreateExpenseItemRequest,
  type UpdateExpenseItemRequest
} from '../services/api';
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function BillPaymentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = id !== undefined && id !== 'new';

  const [formData, setFormData] = useState(() => {
    // Initialize with query parameters if present
    const billTypeId = searchParams.get('bill_type_id');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const amount = searchParams.get('amount');
    
    return {
      bill_type_id: billTypeId ? parseInt(billTypeId) : 0,
      year: year ? parseInt(year) : new Date().getFullYear(),
      month: month ? parseInt(month) : new Date().getMonth() + 1,
      amount: amount || '',
      note: '',
    };
  });

  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [linkedExpenseItems, setLinkedExpenseItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEdit);

  // Load bill types and expense types
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [billTypesResponse, expenseTypesResponse] = await Promise.all([
          billTypeAPI.list(),
          expenseTypeAPI.list()
        ]);
        
        setBillTypes(billTypesResponse.bill_types.filter(bt => !bt.stopped));
        setExpenseTypes(expenseTypesResponse.expense_types);
        
        // Only set default bill type if not already set from query params and not editing
        if (billTypesResponse.bill_types.length > 0 && !isEdit && formData.bill_type_id === 0) {
          setFormData(prev => ({ ...prev, bill_type_id: billTypesResponse.bill_types[0]!.id }));
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load required data');
      }
    };

    void loadData();
  }, [isEdit, formData.bill_type_id]);

  // Pre-fill amount when bill type changes and has fixed amount
  useEffect(() => {
    if (!isEdit && formData.bill_type_id > 0 && billTypes.length > 0) {
      const selectedBillType = billTypes.find(bt => bt.id === formData.bill_type_id);
      if (selectedBillType?.fixed_amount && !formData.amount) {
        setFormData(prev => ({
          ...prev,
          amount: selectedBillType.fixed_amount
        }));
      }
    }
  }, [formData.bill_type_id, billTypes, isEdit, formData.amount]);

  // Load existing bill payment and linked expense items for editing
  useEffect(() => {
    if (isEdit && id) {
      const loadBillPayment = async (): Promise<void> => {
        try {
          setInitialLoading(true);
          const [billPayment, expenseItemsResponse] = await Promise.all([
            billPaymentAPI.get(parseInt(id)),
            expenseItemAPI.list({ bill_payment_id: parseInt(id) })
          ]);
          
          setFormData({
            bill_type_id: billPayment.bill_type_id,
            year: billPayment.year,
            month: billPayment.month,
            amount: billPayment.amount,
            note: billPayment.note,
          });
          
          setLinkedExpenseItems(expenseItemsResponse.expense_items || []);
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
    
    if (!formData.bill_type_id) {
      setError('Please select a bill type');
      return;
    }

    if (!isExpenseTotalValid()) {
      setError('Total expense amount cannot exceed the bill payment amount');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Allow empty amount (will be treated as 0) to mark bill as settled
      const processedAmount = formData.amount === '' ? '0' : formData.amount;

      let billPayment;
      if (isEdit && id) {
        const updateData: UpdateBillPaymentRequest = {
          amount: processedAmount,
          note: formData.note,
        };
        billPayment = await billPaymentAPI.update(parseInt(id), updateData);
      } else {
        const createData: CreateBillPaymentRequest = {
          bill_type_id: formData.bill_type_id,
          year: formData.year,
          month: formData.month,
          amount: processedAmount,
          note: formData.note,
        };
        billPayment = await billPaymentAPI.create(createData);
      }

      // Save expense items
      for (const expenseItem of linkedExpenseItems) {
        if (expenseItem.id > 1000000000) { // New item (timestamp ID)
          const createExpenseData: CreateExpenseItemRequest = {
            bill_payment_id: billPayment.id,
            expense_type_id: expenseItem.expense_type_id,
            year: formData.year,
            month: formData.month,
            amount: expenseItem.amount,
            note: expenseItem.note || '',
          };
          await expenseItemAPI.create(createExpenseData);
        } else { // Existing item
          const updateExpenseData: UpdateExpenseItemRequest = {
            bill_payment_id: billPayment.id,
            expense_type_id: expenseItem.expense_type_id,
            year: formData.year,
            month: formData.month,
            amount: expenseItem.amount,
            note: expenseItem.note || '',
          };
          await expenseItemAPI.update(expenseItem.id, updateExpenseData);
        }
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
      const newFormData = {
        ...formData,
        [name]: parseInt(value) || 0,
      };

      // If bill type changed and has fixed amount, pre-fill amount unless user already entered one
      if (name === 'bill_type_id' && !isEdit) {
        const selectedBillType = billTypes.find(bt => bt.id === parseInt(value));
        if (selectedBillType?.fixed_amount && (!formData.amount || formData.amount === '0' || formData.amount === '')) {
          newFormData.amount = selectedBillType.fixed_amount;
        }
      }

      setFormData(newFormData);
    } else {
      // Keep amount and note as strings
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Expense item management functions
  const addExpenseItem = () => {
    if (expenseTypes.length === 0) return;
    
    const newExpenseItem: Partial<ExpenseItem> = {
      id: Date.now(), // Temporary ID for new items
      expense_type_id: expenseTypes[0]!.id,
      amount: '0',
      note: '',
      year: formData.year,
      month: formData.month,
      bill_payment_id: isEdit ? parseInt(id!) : undefined,
    };
    
    setLinkedExpenseItems(prev => [...prev, newExpenseItem as ExpenseItem]);
  };

  const updateExpenseItem = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setLinkedExpenseItems(prev => 
      prev.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeExpenseItem = async (index: number) => {
    const item = linkedExpenseItems[index];
    if (!item) return;

    // If it's an existing expense item (has a real ID), delete it from the server
    if (item.id < 1000000000 && isEdit) { // Real IDs are smaller than timestamp IDs
      try {
        await expenseItemAPI.delete(item.id);
      } catch (err) {
        console.error('Failed to delete expense item:', err);
        setError('Failed to delete expense item');
        return;
      }
    }

    setLinkedExpenseItems(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalExpenseAmount = () => {
    return linkedExpenseItems.reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
  };

  const getBillAmount = () => {
    return parseFloat(formData.amount || '0');
  };

  const isExpenseTotalValid = () => {
    const billAmount = getBillAmount();
    const expenseTotal = getTotalExpenseAmount();
    return billAmount === 0 || expenseTotal <= billAmount;
  };

  const getMonthName = (month: number): string => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] ?? '';
  };

  const formatCurrency = (amount: string): string => {
    if (!amount) return '$0';
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Bill Payment' : 'Add New Bill Payment'}
          </h1>
          {!isEdit && searchParams.get('bill_type_id') && (
            <p className="text-sm text-gray-600 mt-1">
              Pre-filled from Bills Due page
            </p>
          )}
        </div>
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
                Amount
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
                  placeholder="0"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Enter the amount you paid for this bill. Leave empty or enter 0 to mark the bill as settled without payment.
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

            {/* Linked Expense Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Linked Expense Items
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Break down this bill payment into expense categories
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addExpenseItem}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Expense
                </button>
              </div>

              {/* Expense Total Validation */}
              {linkedExpenseItems.length > 0 && (
                <div className={`mb-4 p-3 rounded-lg ${!isExpenseTotalValid() ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Total Expenses:</span>
                    <span className={!isExpenseTotalValid() ? 'text-red-700' : 'text-green-700'}>
                      {formatCurrency(getTotalExpenseAmount().toString())} / {formatCurrency(formData.amount)}
                    </span>
                  </div>
                  {!isExpenseTotalValid() && (
                    <p className="text-red-700 text-xs mt-1">
                      Expense total cannot exceed bill payment amount
                    </p>
                  )}
                </div>
              )}

              {/* Expense Items List */}
              <div className="space-y-3">
                {linkedExpenseItems.map((item, index) => {
                  return (
                    <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Expense Type *
                          </label>
                          <select
                            value={item.expense_type_id}
                            onChange={(e) => updateExpenseItem(index, 'expense_type_id', parseInt(e.target.value))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {expenseTypes.map((expenseType) => (
                              <option key={expenseType.id} value={expenseType.id}>
                                {expenseType.icon} {expenseType.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Amount *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <span className="text-gray-500 text-sm">$</span>
                            </div>
                            <input
                              type="number"
                              value={item.amount}
                              onChange={(e) => updateExpenseItem(index, 'amount', e.target.value)}
                              step="0.01"
                              min="0"
                              max={formData.amount}
                              className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeExpenseItem(index)}
                            className="w-full px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            <TrashIcon className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Note (Optional)
                        </label>
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => updateExpenseItem(index, 'note', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Expense description..."
                        />
                      </div>
                    </div>
                  );
                })}
                
                {linkedExpenseItems.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 text-sm">No expense items added</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Add expense items to categorize this bill payment
                    </p>
                  </div>
                )}
              </div>
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
                disabled={loading || !isExpenseTotalValid()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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

            {linkedExpenseItems.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Linked Expenses ({linkedExpenseItems.length})</p>
                <div className="space-y-2">
                  {linkedExpenseItems.map((item, index) => {
                    const expenseType = expenseTypes.find(et => et.id === item.expense_type_id);
                    return (
                      <div key={item.id || index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: expenseType?.color || '#6b7280' }}
                          />
                          <span>{expenseType?.name || 'Unknown'}</span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2 flex justify-between text-sm font-medium">
                    <span>Total Expenses:</span>
                    <span className={!isExpenseTotalValid() ? 'text-red-600' : 'text-gray-900'}>
                      {formatCurrency(getTotalExpenseAmount().toString())}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
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
