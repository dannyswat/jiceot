import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billTypeAPI, expenseTypeAPI, type CreateBillTypeRequest, type CreateExpenseTypeRequest } from '../services/api';
import { ArrowLeftIcon, PlusIcon, TrashIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';

const CYCLE_OPTIONS = [
  { value: 0, label: 'On-demand' },
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Bi-monthly' },
  { value: 3, label: 'Quarterly' },
  { value: 4, label: 'Every 4 months' },
  { value: 6, label: 'Semi-annually' },
  { value: 12, label: 'Annually' },
];

interface Template {
  name: string;
  billTypes: Omit<BillTypeInput, 'tempId'>[];
  expenseTypes: Omit<ExpenseTypeInput, 'tempId'>[];
}

const TEMPLATES: Template[] = [
  {
    name: 'Personal Finance Essentials',
    billTypes: [
      { name: 'Rent/Mortgage', icon: '🏠', color: '#3B82F6', bill_cycle: 1, bill_day: 1, fixed_amount: '', createExpenseType: false },
      { name: 'Electricity', icon: '⚡', color: '#F59E0B', bill_cycle: 1, bill_day: 5, fixed_amount: '', createExpenseType: false },
      { name: 'Water', icon: '💧', color: '#06B6D4', bill_cycle: 1, bill_day: 10, fixed_amount: '', createExpenseType: false },
      { name: 'Internet', icon: '🌐', color: '#8B5CF6', bill_cycle: 1, bill_day: 15, fixed_amount: '', createExpenseType: false },
      { name: 'Phone', icon: '📱', color: '#10B981', bill_cycle: 1, bill_day: 20, fixed_amount: '', createExpenseType: false },
      { name: 'Insurance', icon: '🛡️', color: '#EF4444', bill_cycle: 1, bill_day: 25, fixed_amount: '', createExpenseType: false },
      { name: 'Streaming Services', icon: '📺', color: '#EC4899', bill_cycle: 1, bill_day: 1, fixed_amount: '', createExpenseType: false },
      { name: 'Gym Membership', icon: '💪', color: '#F97316', bill_cycle: 1, bill_day: 1, fixed_amount: '', createExpenseType: false },
    ],
    expenseTypes: [
      { name: 'Groceries', icon: '🛒', color: '#10B981' },
      { name: 'Dining Out', icon: '🍔', color: '#F59E0B' },
      { name: 'Transportation', icon: '🚗', color: '#3B82F6' },
      { name: 'Entertainment', icon: '🎮', color: '#8B5CF6' },
      { name: 'Healthcare', icon: '💊', color: '#EF4444' },
      { name: 'Clothing', icon: '👕', color: '#EC4899' },
      { name: 'Personal Care', icon: '💇', color: '#06B6D4' },
      { name: 'Education', icon: '🎓', color: '#F97316' },
    ],
  },
];

interface BillTypeInput {
  tempId: string;
  name: string;
  icon: string;
  color: string;
  bill_cycle: number | '';
  bill_day: number | '';
  fixed_amount: string;
  createExpenseType: boolean;
}

interface ExpenseTypeInput extends CreateExpenseTypeRequest {
  tempId: string;
}

export default function BatchCreateTypesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'bill' | 'expense'>('bill');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Bill Types
  const [billTypes, setBillTypes] = useState<BillTypeInput[]>([
    {
      tempId: '1',
      name: '',
      icon: '💳',
      color: '#3B82F6',
      bill_cycle: 1,
      bill_day: 1,
      fixed_amount: '',
      createExpenseType: false,
    },
  ]);

  // Expense Types
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeInput[]>([
    {
      tempId: '1',
      name: '',
      icon: '🛒',
      color: '#10B981',
    },
  ]);

  const applyTemplate = (templateName: string) => {
    const template = TEMPLATES.find(t => t.name === templateName);
    if (!template) return;

    // Apply bill types
    const newBillTypes = template.billTypes.map((bt, index) => ({
      ...bt,
      tempId: (index + 1).toString(),
    }));
    setBillTypes(newBillTypes);

    // Apply expense types
    const newExpenseTypes = template.expenseTypes.map((et, index) => ({
      ...et,
      tempId: (index + 1).toString(),
    }));
    setExpenseTypes(newExpenseTypes);

    // Clear any error/success messages
    setError('');
    setSuccess('');
  };

  const addBillType = () => {
    const newId = (Math.max(...billTypes.map(bt => parseInt(bt.tempId))) + 1).toString();
    setBillTypes([
      ...billTypes,
      {
        tempId: newId,
        name: '',
        icon: '💳',
        color: '#3B82F6',
        bill_cycle: 1,
        bill_day: 1,
        fixed_amount: '',
        createExpenseType: false,
      },
    ]);
  };

  const removeBillType = (tempId: string) => {
    if (billTypes.length > 1) {
      setBillTypes(billTypes.filter(bt => bt.tempId !== tempId));
    }
  };

  const updateBillType = (tempId: string, field: keyof BillTypeInput, value: string | number | boolean) => {
    setBillTypes(billTypes.map(bt =>
      bt.tempId === tempId ? { ...bt, [field]: value } : bt
    ));
  };

  const addExpenseType = () => {
    const newId = (Math.max(...expenseTypes.map(et => parseInt(et.tempId)), 0) + 1).toString();
    setExpenseTypes([
      ...expenseTypes,
      {
        tempId: newId,
        name: '',
        icon: '🛒',
        color: '#10B981',
      },
    ]);
  };

  const removeExpenseType = (tempId: string) => {
    if (expenseTypes.length > 1) {
      setExpenseTypes(expenseTypes.filter(et => et.tempId !== tempId));
    }
  };

  const updateExpenseType = (tempId: string, field: keyof ExpenseTypeInput, value: string) => {
    setExpenseTypes(expenseTypes.map(et =>
      et.tempId === tempId ? { ...et, [field]: value } : et
    ));
  };

  const validateBillTypes = (): boolean => {
    for (const billType of billTypes) {
      if (!billType.name.trim()) {
        setError('All bill types must have a name');
        return false;
      }
      if (billType.bill_cycle === '' || billType.bill_cycle < 1) {
        setError('Bill cycle must be at least 1 month');
        return false;
      }
    }
    return true;
  };

  const validateExpenseTypes = (): boolean => {
    for (const expenseType of expenseTypes) {
      if (!expenseType.name.trim()) {
        setError('All expense types must have a name');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    // Validate both types
    const hasBillTypes = billTypes.some(bt => bt.name.trim());
    const hasExpenseTypes = expenseTypes.some(et => et.name.trim());

    if (!hasBillTypes && !hasExpenseTypes) {
      setError('Please add at least one bill type or expense type');
      return;
    }

    if (hasBillTypes && !validateBillTypes()) return;
    if (hasExpenseTypes && !validateExpenseTypes()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const promises: Promise<unknown>[] = [];
      let billTypeCount = 0;
      let expenseTypeCount = 0;
      let matchingExpenseTypeCount = 0;

      // Create bill types
      if (hasBillTypes) {
        const billTypePromises = billTypes
          .filter(billType => billType.name.trim())
          .map(billType => {
            billTypeCount++;
            const data: CreateBillTypeRequest = {
              name: billType.name.trim(),
              icon: billType.icon,
              color: billType.color,
              bill_cycle: billType.bill_cycle as number,
              bill_day: billType.bill_day === '' ? 0 : billType.bill_day,
              fixed_amount: billType.fixed_amount || undefined,
            };
            return billTypeAPI.create(data);
          });
        promises.push(...billTypePromises);

        // Create matching expense types for checked items
        const matchingExpenseTypePromises = billTypes
          .filter(billType => billType.name.trim() && billType.createExpenseType)
          .map(billType => {
            matchingExpenseTypeCount++;
            const data: CreateExpenseTypeRequest = {
              name: billType.name.trim(),
              icon: billType.icon,
              color: billType.color,
            };
            return expenseTypeAPI.create(data);
          });
        promises.push(...matchingExpenseTypePromises);
      }

      // Create expense types
      if (hasExpenseTypes) {
        const expenseTypePromises = expenseTypes
          .filter(expenseType => expenseType.name.trim())
          .map(expenseType => {
            expenseTypeCount++;
            const data: CreateExpenseTypeRequest = {
              name: expenseType.name.trim(),
              icon: expenseType.icon,
              color: expenseType.color,
            };
            return expenseTypeAPI.create(data);
          });
        promises.push(...expenseTypePromises);
      }

      await Promise.all(promises);

      // Build success message
      const messages: string[] = [];
      if (billTypeCount > 0) {
        messages.push(`${billTypeCount} bill type(s)`);
      }
      const totalExpenseTypes = expenseTypeCount + matchingExpenseTypeCount;
      if (totalExpenseTypes > 0) {
        messages.push(`${totalExpenseTypes} expense type(s)`);
      }
      setSuccess(`Successfully created ${messages.join(' and ')}!`);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to create types:', err);
      setError('Failed to create some types. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const commonIcons = ['💳', '💰', '🏠', '🚗', '📱', '🍔', '🎮', '🛒', '⚡', '💊', '🎓', '✈️'];
  const commonColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Batch Create Types</h1>
            <p className="text-gray-600">Create multiple bill types or expense types at once</p>
          </div>
        </div>
        
        {/* Template Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Template:</label>
          <select
            onChange={(e) => {
              if (e.target.value) {
                applyTemplate(e.target.value);
                e.target.value = ''; // Reset selection
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a template...</option>
            {TEMPLATES.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('bill')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'bill'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bill Types
            </button>
            <button
              onClick={() => setActiveTab('expense')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'expense'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Expense Types
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          {/* Bill Types Tab */}
          {activeTab === 'bill' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Add multiple bill types to track recurring payments like rent, utilities, subscriptions, etc.
                </p>
                <button
                  onClick={addBillType}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Row
                </button>
              </div>

              {/* Bill Types Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3 border-b">Name *</th>
                      <th className="px-4 py-3 border-b">Icon</th>
                      <th className="px-4 py-3 border-b">Color</th>
                      <th className="px-4 py-3 border-b">Cycle *</th>
                      <th className="px-4 py-3 border-b">Due Day</th>
                      <th className="px-4 py-3 border-b">Fixed Amount</th>
                      <th className="px-4 py-3 border-b">Create Expense Type</th>
                      <th className="px-4 py-3 border-b w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billTypes.map((billType) => (
                      <tr key={billType.tempId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={billType.name}
                            onChange={(e) => updateBillType(billType.tempId, 'name', e.target.value)}
                            placeholder="e.g., Rent, Electricity"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={billType.icon}
                              onChange={(e) => updateBillType(billType.tempId, 'icon', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength={2}
                            />
                            <select
                              value=""
                              onChange={(e) => updateBillType(billType.tempId, 'icon', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Pick</option>
                              {commonIcons.map((icon) => (
                                <option key={icon} value={icon}>{icon}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="color"
                            value={billType.color}
                            onChange={(e) => updateBillType(billType.tempId, 'color', e.target.value)}
                            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={billType.bill_cycle}
                            onChange={(e) => updateBillType(billType.tempId, 'bill_cycle', parseInt(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CYCLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={billType.bill_day}
                            onChange={(e) => updateBillType(billType.tempId, 'bill_day', e.target.value ? parseInt(e.target.value) : '')}
                            placeholder="0"
                            min="0"
                            max="31"
                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={billType.fixed_amount}
                            onChange={(e) => updateBillType(billType.tempId, 'fixed_amount', e.target.value)}
                            placeholder="Optional"
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={billType.createExpenseType}
                            onChange={(e) => updateBillType(billType.tempId, 'createExpenseType', e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeBillType(billType.tempId)}
                            disabled={billTypes.length === 1}
                            className="p-1 text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Expense Types Tab */}
          {activeTab === 'expense' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Add multiple expense types to categorize your spending like groceries, dining, transportation, etc.
                </p>
                <button
                  onClick={addExpenseType}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Row
                </button>
              </div>

              {/* Expense Types Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3 border-b">Name *</th>
                      <th className="px-4 py-3 border-b">Icon</th>
                      <th className="px-4 py-3 border-b">Color</th>
                      <th className="px-4 py-3 border-b w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseTypes.map((expenseType) => (
                      <tr key={expenseType.tempId} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={expenseType.name}
                            onChange={(e) => updateExpenseType(expenseType.tempId, 'name', e.target.value)}
                            placeholder="e.g., Groceries, Dining"
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={expenseType.icon}
                              onChange={(e) => updateExpenseType(expenseType.tempId, 'icon', e.target.value)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              maxLength={2}
                            />
                            <select
                              value=""
                              onChange={(e) => updateExpenseType(expenseType.tempId, 'icon', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Pick</option>
                              {commonIcons.map((icon) => (
                                <option key={icon} value={icon}>{icon}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={expenseType.color}
                              onChange={(e) => updateExpenseType(expenseType.tempId, 'color', e.target.value)}
                              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                            />
                            <select
                              value=""
                              onChange={(e) => updateExpenseType(expenseType.tempId, 'color', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Pick</option>
                              {commonColors.map((color) => (
                                <option key={color} value={color} style={{ backgroundColor: color }}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeExpenseType(expenseType.tempId)}
                            disabled={expenseTypes.length === 1}
                            className="p-1 text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Remove"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Combined Submit Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create All Types'}
            </button>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <DocumentPlusIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Tips for batch creation:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Use meaningful names to easily identify your types later</li>
              <li>Choose distinct icons and colors for better visual organization</li>
              <li>Bill cycle: 1=monthly, 3=quarterly, 12=annually</li>
              <li>Due day: 0 means end of month, 1-31 for specific days</li>
              <li>You can add more rows as needed before submitting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
