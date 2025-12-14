import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expenseTypeAPI, billTypeAPI, type CreateExpenseTypeRequest, type UpdateExpenseTypeRequest, type BillType } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { PRESET_COLORS, PRESET_ICONS, CYCLE_OPTIONS } from '../common/constants';

export default function ExpenseTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    color: PRESET_COLORS[0],
    bill_day: 0,
    bill_cycle: 0,
    fixed_amount: '',
    default_bill_type_id: 0,
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
        setBillTypes(response.bill_types || []);
      } catch (err) {
        console.error('Failed to load bill types:', err);
      }
    };

    void loadBillTypes();
  }, []);

  // Load existing expense type for editing
  useEffect(() => {
    if (isEdit && id) {
      const loadExpenseType = async (): Promise<void> => {
        try {
          setInitialLoading(true);
          const expenseType = await expenseTypeAPI.get(parseInt(id));
          setFormData({
            name: expenseType.name,
            icon: expenseType.icon,
            color: expenseType.color || PRESET_COLORS[0],
            bill_day: expenseType.bill_day || 0,
            bill_cycle: expenseType.bill_cycle || 0,
            fixed_amount: expenseType.fixed_amount || '',
            default_bill_type_id: expenseType.default_bill_type_id || 0,
          });
        } catch (err) {
          console.error('Failed to load expense type:', err);
          setError('Failed to load expense type');
        } finally {
          setInitialLoading(false);
        }
      };

      void loadExpenseType();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter an expense type name');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (isEdit && id) {
        const updateData: UpdateExpenseTypeRequest = {
          name: formData.name.trim(),
          bill_day: formData.bill_day,
          bill_cycle: formData.bill_cycle,
        };
        
        // Only include optional fields if they have values
        if (formData.icon) updateData.icon = formData.icon;
        if (formData.color) updateData.color = formData.color;
        if (formData.fixed_amount && formData.fixed_amount.trim() !== '') {
          updateData.fixed_amount = formData.fixed_amount.trim();
        }
        if (formData.default_bill_type_id > 0) {
          updateData.default_bill_type_id = formData.default_bill_type_id;
        }
        
        await expenseTypeAPI.update(parseInt(id), updateData);
      } else {
        const createData: CreateExpenseTypeRequest = {
          name: formData.name.trim(),
          bill_day: formData.bill_day,
          bill_cycle: formData.bill_cycle,
        };
        
        // Only include optional fields if they have values
        if (formData.icon) createData.icon = formData.icon;
        if (formData.color) createData.color = formData.color;
        if (formData.fixed_amount && formData.fixed_amount.trim() !== '') {
          createData.fixed_amount = formData.fixed_amount.trim();
        }
        if (formData.default_bill_type_id > 0) {
          createData.default_bill_type_id = formData.default_bill_type_id;
        }
        
        await expenseTypeAPI.create(createData);
      }

      navigate('/expense-types');
    } catch (err: unknown) {
      console.error('Failed to save expense type:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save expense type');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    
    // Handle numeric fields specifically
    if (name === 'bill_day' || name === 'bill_cycle' || name === 'default_bill_type_id') {
      setFormData(prev => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleColorSelect = (color: string): void => {
    setFormData(prev => ({
      ...prev,
      color,
    }));
  };

  const handleIconSelect = (icon: string): void => {
    setFormData(prev => ({
      ...prev,
      icon,
    }));
  };

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
          onClick={() => navigate('/expense-types')}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Expense Type' : 'Add New Expense Type'}
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
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Expense Type Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Food & Dining, Transportation, Entertainment"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Choose a clear and descriptive name for your expense category
              </p>
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon (Optional)
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  placeholder="Enter an emoji or leave blank"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Quick selection:</p>
                  <div className="grid grid-cols-8 gap-2">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleIconSelect(icon)}
                        className={`p-2 rounded border text-lg hover:bg-gray-50 ${
                          formData.icon === icon 
                            ? 'border-indigo-500 bg-blue-50' 
                            : 'border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="space-y-3">
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  placeholder="#ef4444"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                />
                <div>
                  <p className="text-xs text-gray-500 mb-2">Preset colors:</p>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorSelect(color)}
                        className={`w-8 h-8 rounded border-2 ${
                          formData.color === color 
                            ? 'border-gray-800' 
                            : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Expense Settings */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Recurring Expense Settings</h3>
              <p className="text-xs text-gray-500">
                Configure if this expense type has a regular billing cycle (e.g., monthly subscriptions)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bill_cycle" className="block text-sm font-medium text-gray-700">
                    Billing Cycle (Months)
                  </label>
                  <select
                    id="bill_cycle"
                    name="bill_cycle"
                    value={formData.bill_cycle}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    {CYCLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    0 = irregular expenses
                  </p>
                </div>

                <div>
                  <label htmlFor="bill_day" className="block text-sm font-medium text-gray-700">
                    Due Day of Month
                  </label>
                  <select
                    id="bill_day"
                    name="bill_day"
                    value={formData.bill_day}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value={0}>No specific day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave as "No specific day" if varies
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="fixed_amount" className="block text-sm font-medium text-gray-700">
                  Fixed Amount (Optional)
                </label>
                <input
                  type="number"
                  id="fixed_amount"
                  name="fixed_amount"
                  step="0.01"
                  min="0"
                  value={formData.fixed_amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty if the amount varies each time
                </p>
              </div>

              <div>
                <label htmlFor="default_bill_type_id" className="block text-sm font-medium text-gray-700">
                  Default Bill Type (Optional)
                </label>
                <select
                  id="default_bill_type_id"
                  name="default_bill_type_id"
                  value={formData.default_bill_type_id}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value={0}>None</option>
                  {billTypes.map((billType) => (
                    <option key={billType.id} value={billType.id}>
                      {billType.icon} {billType.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Auto-fill this bill type when creating expenses of this type
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/expense-types')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Expense Type' : 'Create Expense Type'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
          
          <div className="space-y-4">
            {/* Preview Card */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: formData.color || '#6b7280' }}
                >
                  {formData.icon || (formData.name ? formData.name.charAt(0).toUpperCase() : '?')}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {formData.name || 'Expense Type Name'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formData.bill_cycle > 0 
                      ? `Recurring every ${formData.bill_cycle} ${formData.bill_cycle === 1 ? 'month' : 'months'}`
                      : 'On-demand'}
                    {formData.bill_day > 0 && ` • Due on ${formData.bill_day}${formData.bill_day === 1 ? 'st' : formData.bill_day === 2 ? 'nd' : formData.bill_day === 3 ? 'rd' : 'th'}`}
                    {formData.fixed_amount && formData.fixed_amount.trim() !== '' && ` • $${formData.fixed_amount}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Preview Badge */}
            <div>
              <p className="text-sm text-gray-500 mb-2">As a badge:</p>
              <div
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                style={{ 
                  backgroundColor: formData.color ? `${formData.color}20` : '#f3f4f6',
                  borderColor: formData.color || '#d1d5db',
                  color: formData.color || '#6b7280'
                }}
              >
                {formData.icon && <span className="mr-1">{formData.icon}</span>}
                {formData.name || 'Expense Type'}
              </div>
            </div>

            {/* Recurring Info */}
            {formData.bill_cycle > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-900 mb-1">Recurring Expense</p>
                <p className="text-xs text-blue-700">
                  This expense type will recur every {formData.bill_cycle} {formData.bill_cycle === 1 ? 'month' : 'months'}
                  {formData.bill_day > 0 && ` on the ${formData.bill_day}${formData.bill_day === 1 ? 'st' : formData.bill_day === 2 ? 'nd' : formData.bill_day === 3 ? 'rd' : 'th'} day`}
                  {formData.fixed_amount && formData.fixed_amount.trim() !== '' && ` with a fixed amount of $${formData.fixed_amount}`}.
                </p>
              </div>
            )}

            {/* Info */}
            <div className="text-xs text-gray-400 pt-4 border-t">
              <p>This preview shows how your expense type will appear in the application.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
