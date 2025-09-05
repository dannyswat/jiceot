import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { expenseTypeAPI, type CreateExpenseTypeRequest, type UpdateExpenseTypeRequest } from '../services/api';
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

const COMMON_ICONS = [
  '💡', '⚡', '🏠', '🏢', '🚰', '💰', '💳', '🍽️', '🛒', 
  '🚗', '⛽', '🚌', '📱', '💻', '🌐', '📺', '🎵', '🎬',
  '🏥', '💊', '🦷', '👨‍⚕️', '🎓', '📚', '🏋️', '🏊', '✂️',
  '👕', '👞', '🛍️', '🎁', '🍕', '☕', '🎉', '🏖️', '✈️'
];

export default function ExpenseTypeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined && id !== 'new';

  const [formData, setFormData] = useState({
    name: '',
    icon: '',
    color: PRESET_COLORS[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEdit);

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
        };
        
        // Only include optional fields if they have values
        if (formData.icon) updateData.icon = formData.icon;
        if (formData.color) updateData.color = formData.color;
        
        await expenseTypeAPI.update(parseInt(id), updateData);
      } else {
        const createData: CreateExpenseTypeRequest = {
          name: formData.name.trim(),
        };
        
        // Only include optional fields if they have values
        if (formData.icon) createData.icon = formData.icon;
        if (formData.color) createData.color = formData.color;
        
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
                    {COMMON_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => handleIconSelect(icon)}
                        className={`p-2 rounded border text-lg hover:bg-gray-50 ${
                          formData.icon === icon 
                            ? 'border-indigo-500 bg-indigo-50' 
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <div>
                  <p className="font-medium text-gray-900">
                    {formData.name || 'Expense Type Name'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formData.color || 'No color selected'}
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
