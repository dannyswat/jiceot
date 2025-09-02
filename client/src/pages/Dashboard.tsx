import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  billPaymentAPI, 
  billTypeAPI, 
  expenseItemAPI, 
  expenseTypeAPI,
  type BillPayment,
  type BillType,
  type ExpenseItem
} from '../services/api';
import { 
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TagIcon,
  PlusIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalExpenses: number;
  billsPaid: number;
  pendingBills: number;
  categories: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    billsPaid: 0,
    pendingBills: 0,
    categories: 0,
  });
  const [recentActivity, setRecentActivity] = useState<(BillPayment | ExpenseItem)[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<BillType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Load data in parallel
      const [
        billPaymentsResponse,
        expenseItemsResponse,
        billTypesResponse,
        expenseTypesResponse,
      ] = await Promise.all([
        billPaymentAPI.list({ year: currentYear, month: currentMonth }),
        expenseItemAPI.list({ year: currentYear, month: currentMonth }),
        billTypeAPI.list(),
        expenseTypeAPI.list(),
      ]);

      // Calculate statistics
      const totalExpenseAmount = expenseItemsResponse.expense_items.reduce(
        (sum, item) => sum + parseFloat(item.amount), 0
      );
      const totalBillAmount = billPaymentsResponse.bill_payments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount), 0
      );

      setStats({
        totalExpenses: totalExpenseAmount + totalBillAmount,
        billsPaid: billPaymentsResponse.bill_payments.length,
        pendingBills: getUpcomingBillsCount(billTypesResponse.bill_types, billPaymentsResponse.bill_payments),
        categories: expenseTypesResponse.expense_types.length + billTypesResponse.bill_types.length,
      });

      // Prepare recent activity (combine bill payments and expense items)
      const recentItems: (BillPayment | ExpenseItem)[] = [
        ...billPaymentsResponse.bill_payments.slice(0, 3),
        ...expenseItemsResponse.expense_items.slice(0, 3),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      setRecentActivity(recentItems);

      // Calculate upcoming bills
      const upcoming = getUpcomingBills(billTypesResponse.bill_types, billPaymentsResponse.bill_payments);
      setUpcomingBills(upcoming);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUpcomingBillsCount = (billTypes: BillType[], billPayments: BillPayment[]): number => {
    return getUpcomingBills(billTypes, billPayments).length;
  };

  const getUpcomingBills = (billTypes: BillType[], billPayments: BillPayment[]): BillType[] => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    return billTypes.filter(billType => {
      if (billType.stopped) return false;

      // Check if this bill has already been paid this month
      const alreadyPaid = billPayments.some(payment => 
        payment.bill_type_id === billType.id &&
        payment.year === currentYear &&
        payment.month === currentMonth
      );

      if (alreadyPaid) return false;

      // Check if bill is due this month
      if (billType.bill_cycle === 1) { // Monthly
        return billType.bill_day >= currentDay;
      }

      return true; // For other cycles, consider them upcoming for now
    }).slice(0, 5);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getDaysUntilDue = (billDay: number): number => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    if (billDay >= currentDay) {
      return billDay - currentDay;
    } else {
      // Next month
      return (daysInMonth - currentDay) + billDay;
    }
  };

  const getDueDateText = (daysUntil: number): string => {
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Due tomorrow";
    if (daysUntil <= 7) return `Due in ${daysUntil} days`;
    return `Due in ${Math.ceil(daysUntil / 7)} week${Math.ceil(daysUntil / 7) > 1 ? 's' : ''}`;
  };

  const getDueDateColor = (daysUntil: number): string => {
    if (daysUntil <= 1) return "text-red-500";
    if (daysUntil <= 3) return "text-yellow-500";
    return "text-blue-500";
  };

  const isBillPayment = (item: BillPayment | ExpenseItem): item is BillPayment => {
    return 'bill_type_id' in item;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your bills and expenses.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Total Expenses</h3>
                  <p className="text-2xl font-bold text-gray-700">{formatAmount(stats.totalExpenses)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Bills Paid</h3>
                  <p className="text-2xl font-bold text-gray-700">{stats.billsPaid}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Pending Bills</h3>
                  <p className="text-2xl font-bold text-gray-700">{stats.pendingBills}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TagIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">Categories</h3>
                  <p className="text-2xl font-bold text-gray-700">{stats.categories}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity and upcoming bills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                <Link 
                  to="/expense-items" 
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  View all
                </Link>
              </div>
              <div className="p-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No recent activity</p>
                    <Link
                      to="/expense-items/new"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Expense
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((item, index) => {
                      const isBill = isBillPayment(item);
                      const name = isBill 
                        ? item.bill_type?.name || 'Bill Payment'
                        : item.expense_type?.name || 'Expense';
                      const icon = isBill 
                        ? item.bill_type?.icon || '💳'
                        : item.expense_type?.icon || '💰';
                      const color = isBill 
                        ? item.bill_type?.color || '#3B82F6'
                        : item.expense_type?.color || '#10B981';

                      return (
                        <div key={`${isBill ? 'bill' : 'expense'}-${item.id}-${index}`} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: color }}
                            >
                              {icon}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{name}</p>
                              <p className="text-xs text-gray-500">
                                {isBill ? 'Bill paid' : 'Expense added'} {' '}
                                {new Date(item.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {formatAmount(parseFloat(item.amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Upcoming Bills</h2>
                <Link 
                  to="/bill-types" 
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  Manage bills
                </Link>
              </div>
              <div className="p-6">
                {upcomingBills.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No upcoming bills</p>
                    <Link
                      to="/bill-types/new"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Bill Type
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBills.map((billType) => {
                      const daysUntil = getDaysUntilDue(billType.bill_day);
                      const dueDateText = getDueDateText(daysUntil);
                      const dueDateColor = getDueDateColor(daysUntil);

                      return (
                        <div key={billType.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: billType.color }}
                            >
                              {billType.icon}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{billType.name}</p>
                              <p className={`text-xs ${dueDateColor}`}>
                                {dueDateText}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {billType.fixed_amount ? formatAmount(parseFloat(billType.fixed_amount)) : 'Variable'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
