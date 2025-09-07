import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { billTypeAPI, expenseTypeAPI, type CreateBillTypeRequest, type UpdateBillTypeRequest, type ExpenseType } from '../services/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#78716c', // Stone
];

const PRESET_ICONS = [
  '💡', '⚡', '🏠', '🏢', '🚰', '💰', '💳', '🍽️', '🛒', 
  '🚗', '⛽', '🚌', '📱', '💻', '🌐', '📺', '🎵', '🎬',
  '🏥', '💊', '🦷', '👨‍⚕️', '🎓', '📚', '🏋️', '🏊', '✂️',
  '👕', '👞', '🛍️', '🎁', '🍕', '☕', '🎉', '🏖️', '✈️'
];

const CYCLE_OPTIONS = [
  { value: 0, label: 'One-time only' },
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Bi-monthly' },
  { value: 3, label: 'Quarterly' },
  { value: 6, label: 'Semi-annually' },
  { value: 12, label: 'Annually' },
];

export default function BillTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    color: PRESET_COLORS[0],
    bill_day: 0,
    bill_cycle: 1,
    fixed_amount: '',
    stopped: false,
    expense_type_id: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  // Load expense types
  useEffect(() => {
    const loadExpenseTypes = async (): Promise<void> => {
      try {
        const response = await expenseTypeAPI.list();
        setExpenseTypes(response.expense_types);
      } catch (err) {
        console.error('Failed to load expense types:', err);
      }
    };

    void loadExpenseTypes();
  }, []);

  // Load existing bill type for editing
  useEffect(() => {
    if (isEdit && id) {
      const loadBillType = async (): Promise<void> => {
        try {
          setInitialLoading(true);
          const billType = await billTypeAPI.get(parseInt(id));
          setFormData({
            name: billType.name,
            icon: billType.icon,
            color: billType.color || PRESET_COLORS[0],
            bill_day: billType.bill_day,
            bill_cycle: billType.bill_cycle,
            fixed_amount: billType.fixed_amount,
            stopped: billType.stopped,
            expense_type_id: billType.expense_type_id?.toString() || '',
          });
        } catch (err) {
          console.error('Failed to load bill type:', err);
          setError('Failed to load bill type');
        } finally {
          setInitialLoading(false);
        }
      };

      void loadBillType();
    }
  }, [isEdit, id]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit && id) {
        const updateData: UpdateBillTypeRequest = {
          name: formData.name,
          bill_day: formData.bill_day,
          bill_cycle: formData.bill_cycle,
          stopped: formData.stopped,
        };
        
        // Only include optional fields if they have values
        if (formData.icon) updateData.icon = formData.icon;
        if (formData.color) updateData.color = formData.color;
        if (formData.fixed_amount && formData.fixed_amount.trim() !== '') {
          updateData.fixed_amount = formData.fixed_amount.trim();
        }
        if (formData.expense_type_id && formData.expense_type_id.trim() !== '') {
          updateData.expense_type_id = parseInt(formData.expense_type_id);
        }
        
        console.log('Sending update data:', updateData);
        await billTypeAPI.update(parseInt(id), updateData);
      } else {
        const createData: CreateBillTypeRequest = {
          name: formData.name,
          bill_day: formData.bill_day,
          bill_cycle: formData.bill_cycle,
        };
        
        // Only include optional fields if they have values
        if (formData.icon) createData.icon = formData.icon;
        if (formData.color) createData.color = formData.color;
        if (formData.fixed_amount && formData.fixed_amount.trim() !== '') {
          createData.fixed_amount = formData.fixed_amount.trim();
        }
        if (formData.expense_type_id && formData.expense_type_id.trim() !== '') {
          createData.expense_type_id = parseInt(formData.expense_type_id);
        }
        
        console.log('Sending create data:', createData);
        await billTypeAPI.create(createData);
      }

      navigate('/bill-types');
    } catch (err: unknown) {
      console.error('Failed to save bill type:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to save bill type');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    
    // Handle numeric fields specifically
    if (name === 'bill_day' || name === 'bill_cycle') {
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

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/bill-types')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Bill Type' : 'Add Bill Type'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update your bill type configuration' : 'Create a new recurring bill type'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Bill Type Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="e.g., Electricity Bill, Rent, Credit Card"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (optional)
                </label>
                
                {/* Preset Icons */}
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">Choose a preset icon:</p>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon }))}
                        className={`w-8 h-8 rounded border-2 flex items-center justify-center text-lg hover:bg-gray-100 transition-colors ${
                          formData.icon === icon ? 'border-indigo-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Icon Input */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Or enter a custom icon:</p>
                  <input
                    type="text"
                    id="icon"
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="💡 🏠 💳"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use an emoji or leave empty to use first letter
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg border-2 ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-1 mt-4">Or enter a custom color:</p>
                <input
                  type="text"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="#ef4444"
                />
              </div>
            </div>
          </div>

          {/* Billing Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Billing Schedule</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bill_cycle" className="block text-sm font-medium text-gray-700">
                  Billing Cycle *
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
                  Leave as "No specific day" if the due date varies
                </p>
              </div>
            </div>
          </div>

          {/* Optional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Optional Settings</h3>
            
            <div>
              <label htmlFor="fixed_amount" className="block text-sm font-medium text-gray-700">
                Fixed Amount (optional)
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
                placeholder="0"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty if the amount varies each time
              </p>
            </div>

            <div>
              <label htmlFor="expense_type_id" className="block text-sm font-medium text-gray-700">
                Default Expense Type (optional)
              </label>
              <select
                id="expense_type_id"
                name="expense_type_id"
                value={formData.expense_type_id}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">No default expense type</option>
                {expenseTypes.map((expenseType) => (
                  <option key={expenseType.id} value={expenseType.id}>
                    {expenseType.icon} {expenseType.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                When a bill payment is added, it will automatically create an expense item with this type
              </p>
            </div>

            {isEdit && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="stopped"
                  name="stopped"
                  checked={formData.stopped}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 text-blue-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="stopped" className="ml-2 block text-sm text-gray-700">
                  Mark as stopped (won't appear in reminders)
                </label>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.icon || (formData.name ? formData.name.charAt(0).toUpperCase() : '?')}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {formData.name || 'Bill Type Name'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {CYCLE_OPTIONS.find(opt => opt.value === formData.bill_cycle)?.label}
                    {formData.bill_day > 0 && ` • Due on ${formData.bill_day}${formData.bill_day === 1 ? 'st' : formData.bill_day === 2 ? 'nd' : formData.bill_day === 3 ? 'rd' : 'th'}`}
                    {formData.fixed_amount && ` • $${formData.fixed_amount}`}
                    {formData.expense_type_id && expenseTypes.find(et => et.id.toString() === formData.expense_type_id) && 
                      ` • Auto-expense: ${expenseTypes.find(et => et.id.toString() === formData.expense_type_id)?.name}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                isEdit ? 'Update Bill Type' : 'Create Bill Type'
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/bill-types')}
              className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
