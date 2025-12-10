import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { expenseTypeAPI, billTypeAPI, type ExpenseType, type BillType } from '../services/api';

export default function QuickAddButton() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'expenses' | 'bills'>('expenses');
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [billTypes, setBillTypes] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      loadData();
    }
  }, [isModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenseTypesResponse, billTypesResponse] = await Promise.all([
        expenseTypeAPI.list(),
        billTypeAPI.list(),
      ]);
      setExpenseTypes(expenseTypesResponse.expense_types);
      
      // Sort bill types: on-demand first, then by next due date
      const activeBillTypes = billTypesResponse.bill_types.filter(bt => !bt.stopped);
      const sortedBillTypes = activeBillTypes.sort((a, b) => {
        // On-demand bills (bill_cycle === 0) come first
        if (a.bill_cycle === 0 && b.bill_cycle !== 0) return -1;
        if (a.bill_cycle !== 0 && b.bill_cycle === 0) return 1;
        if (a.bill_cycle === 0 && b.bill_cycle === 0) return a.name.localeCompare(b.name);
        
        // For recurring bills, calculate next due date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        
        const getNextDueDate = (billType: BillType) => {
          let dueYear = currentYear;
          let dueMonth = currentMonth;
          
          // If current day is past bill day, next due is next month
          if (currentDay > billType.bill_day) {
            dueMonth++;
            if (dueMonth > 12) {
              dueMonth = 1;
              dueYear++;
            }
          }
          
          return new Date(dueYear, dueMonth - 1, billType.bill_day).getTime();
        };
        
        const aDueDate = getNextDueDate(a);
        const bDueDate = getNextDueDate(b);
        
        return aDueDate - bDueDate;
      });
      
      setBillTypes(sortedBillTypes);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseTypeClick = (expenseTypeId: number) => {
    const now = new Date();
    navigate(`/expense-items/new?expense_type_id=${expenseTypeId}&year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
    setIsModalOpen(false);
  };

  const handleBillTypeClick = (billType: BillType) => {
    const now = new Date();
    navigate(`/bill-payments/new?bill_type_id=${billType.id}&year=${now.getFullYear()}&month=${now.getMonth() + 1}&amount=${billType.fixed_amount || ''}`);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-yellow-500 text-white shadow-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition-all duration-200 hover:scale-110"
        aria-label="Quick Add"
      >
        <PlusIcon className="h-6 w-6 mx-auto" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Add</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Tabs - Mobile Only */}
              <div className="border-b border-gray-200 lg:hidden">
                <nav className="flex -mb-px px-4">
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'expenses'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setActiveTab('bills')}
                    className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'bills'
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Bills
                  </button>
                </nav>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto lg:overflow-hidden">
                <div className="lg:grid lg:grid-cols-2 lg:gap-6">
                {loading ? (
                  <div className="flex justify-center py-12 lg:col-span-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Expenses Section */}
                    <div className={`${activeTab === 'bills' ? 'hidden lg:block' : ''}`}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 hidden lg:block">Expenses</h3>
                      {expenseTypes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <p className="text-sm">No expense types found.</p>
                          <button
                            onClick={() => {
                              navigate('/expense-types/new');
                              setIsModalOpen(false);
                            }}
                            className="mt-4 text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                          >
                            Create Expense Type
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 max-h-[60vh] lg:max-h-[65vh] overflow-y-auto">
                          {expenseTypes.map((expenseType) => (
                            <button
                              key={expenseType.id}
                              onClick={() => handleExpenseTypeClick(expenseType.id)}
                              className="flex flex-col items-center p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-300 transition-all text-center group"
                            >
                              <div
                                className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-lg sm:text-xl group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: `${expenseType.color || '#6366f1'}20` }}
                              >
                                {expenseType.icon || '📝'}
                              </div>
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate w-full mt-1">
                                {expenseType.name}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bills Section */}
                    <div className={`${activeTab === 'expenses' ? 'hidden lg:block' : ''} ${activeTab === 'bills' ? 'lg:mt-0' : ''}`}>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 hidden lg:block">Bills</h3>
                      {billTypes.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <p className="text-sm">No bill types found.</p>
                          <button
                            onClick={() => {
                              navigate('/bill-types/new');
                              setIsModalOpen(false);
                            }}
                            className="mt-4 text-yellow-600 hover:text-yellow-700 font-medium text-sm"
                          >
                            Create Bill Type
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-2 gap-2 max-h-[60vh] lg:max-h-[65vh] overflow-y-auto">
                          {billTypes.map((billType) => (
                            <button
                              key={billType.id}
                              onClick={() => handleBillTypeClick(billType)}
                              className="flex flex-col items-center p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-yellow-300 transition-all text-center group"
                            >
                              <div
                                className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-lg sm:text-xl group-hover:scale-110 transition-transform"
                                style={{ backgroundColor: `${billType.color || '#6366f1'}20` }}
                              >
                                {billType.icon || '💳'}
                              </div>
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate w-full mt-1">
                                {billType.name}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                                <span className="text-[10px] sm:text-xs">Day {billType.bill_day}</span>
                                {billType.fixed_amount && (
                                  <>
                                    <span className="text-[10px]">•</span>
                                    <span className="text-[10px] sm:text-xs">${billType.fixed_amount}</span>
                                  </>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
