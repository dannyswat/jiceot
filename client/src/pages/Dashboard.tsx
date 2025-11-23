import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  billPaymentAPI, 
  billTypeAPI, 
  expenseItemAPI, 
  expenseTypeAPI,
  type BillPayment,
  type BillType
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

interface UpcomingBill extends BillType {
  nextDueDate: Date;
  daysUntilDue: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    billsPaid: 0,
    pendingBills: 0,
    categories: 0,
  });
  const [onDemandBills, setOnDemandBills] = useState<BillType[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<UpcomingBill[]>([]);
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
        allBillPaymentsResponse, // Get all payments to check payment history
        expenseItemsResponse,
        billTypesResponse,
        expenseTypesResponse,
      ] = await Promise.all([
        billPaymentAPI.list({}), // Get all payments for proper calculation
        expenseItemAPI.list({ year: currentYear, month: currentMonth }),
        billTypeAPI.list(),
        expenseTypeAPI.list(),
      ]);

      // Get current month payments for stats
      const currentMonthPayments = allBillPaymentsResponse.bill_payments.filter(
        payment => payment.year === currentYear && payment.month === currentMonth
      );

      // Calculate statistics
      const totalExpenseAmount = expenseItemsResponse.expense_items.reduce(
        (sum, item) => sum + (item.bill_payment_id ? 0 : parseFloat(item.amount)), 0
      );
      const totalBillAmount = currentMonthPayments.reduce(
        (sum, payment) => sum + parseFloat(payment.amount), 0
      );

      setStats({
        totalExpenses: totalExpenseAmount + totalBillAmount,
        billsPaid: currentMonthPayments.length,
        pendingBills: getUpcomingBillsCount(billTypesResponse.bill_types, allBillPaymentsResponse.bill_payments),
        categories: expenseTypesResponse.expense_types.length,
      });

      // Calculate upcoming bills
      const upcoming = getUpcomingBills(billTypesResponse.bill_types, allBillPaymentsResponse.bill_payments);
      setUpcomingBills(upcoming);

      const onDemand = billTypesResponse.bill_types.filter(bt => bt.bill_cycle === 0 && !bt.stopped);
      setOnDemandBills(onDemand);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate next due date based on last payment and bill cycle
  const calculateNextDueDateFromLastPayment = (
    billType: BillType,
    lastPayment: BillPayment | undefined,
    currentYear: number,
    currentMonth: number
  ): Date => {
    // If no last payment, bill is due in current month
    if (!lastPayment) {
      if (billType.bill_day === 0) {
        // No specific day, use end of month
        return new Date(currentYear, currentMonth, 0);
      }
      return new Date(currentYear, currentMonth - 1, billType.bill_day);
    }

    // Calculate next due date based on last payment + bill cycle
    let nextDueYear = lastPayment.year;
    let nextDueMonth = lastPayment.month + billType.bill_cycle;

    // Handle year overflow
    while (nextDueMonth > 12) {
      nextDueYear++;
      nextDueMonth -= 12;
    }

    if (billType.bill_day === 0) {
      // No specific day, use end of month
      return new Date(nextDueYear, nextDueMonth, 0);
    }

    return new Date(nextDueYear, nextDueMonth - 1, billType.bill_day);
  };

  const getUpcomingBillsCount = (billTypes: BillType[], billPayments: BillPayment[]): number => {
    return getUpcomingBills(billTypes, billPayments).length;
  };

  const getUpcomingBills = (billTypes: BillType[], allPayments: BillPayment[]): UpcomingBill[] => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const upcomingBills = billTypes
      .filter(billType => !billType.stopped && billType.bill_cycle > 0)
      .map(billType => {
        const lastPayment = allPayments
          .filter(payment => payment.bill_type_id === billType.id)
          .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];

        // Calculate next due date based on last payment + bill cycle
        const nextDueDate = calculateNextDueDateFromLastPayment(billType, lastPayment, currentYear, currentMonth);
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check for current month payment
        const hasCurrentPayment = allPayments.some(payment => 
          payment.bill_type_id === billType.id && 
          payment.year === currentYear && 
          payment.month === currentMonth
        );

        // Determine if bill should be shown as paid:
        // - If there's a payment for current month, OR
        // - If the next due date is not in the current month
        const nextDueDateMonth = nextDueDate.getMonth() + 1;
        const nextDueDateYear = nextDueDate.getFullYear();
        const isNextDueDateInCurrentMonth = nextDueDateMonth === currentMonth && nextDueDateYear === currentYear;
        
        const isPaid = hasCurrentPayment || !isNextDueDateInCurrentMonth;

        return {
          ...billType,
          nextDueDate,
          daysUntilDue,
          isPaid
        };
      })
      .filter(bill => !bill.isPaid && bill.daysUntilDue >= 0) // Only show unpaid bills that are due soon
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Sort by days until due
      .slice(0, 5); // Take top 5

    return upcomingBills;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
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

    const handleCreatePayment = (billType: BillType) => {
    // Navigate to bill payment form with pre-selected data and returnUrl
    const queryParams = new URLSearchParams({
      bill_type_id: billType.id.toString(),
      amount: billType.fixed_amount || '',
      returnUrl: '/'
    });
    
    navigate(`/bill-payments/new?${queryParams.toString()}`);
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
                  <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
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

          {/* Quick Setup Card */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <PlusIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Quick Setup</h3>
                  <p className="text-blue-100 text-sm">
                    Create multiple bill types or expense types at once
                  </p>
                </div>
              </div>
              <Link
                to="/batch-create-types"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Batch Create Types
              </Link>
            </div>
          </div>

          {/* On-demand bills and upcoming bills */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">On-demand Payments</h2>
                <Link 
                  to="/bill-payments" 
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View payments
                </Link>
              </div>
              <div className="p-6">
                {onDemandBills.length === 0 ? (
                  <div className="text-center py-8">
                    <CurrencyDollarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No on-demand bill types</p>
                    <Link
                      to="/bill-types/new"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Bill Type
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {onDemandBills.map((billType) => {

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
                            </div>
                          </div>
                          <button
                          onClick={() => handleCreatePayment(billType)}
                          className={`inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                            'bg-blue-600 hover:bg-blue-700 focus:ring-indigo-500'
                          }`}
                        >
                          <CurrencyDollarIcon className="-ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          <span className="whitespace-nowrap">Pay Now</span>
                        </button>
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
                  to="/bill-payments/due" 
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Pay bills
                </Link>
              </div>
              <div className="p-6">
                {upcomingBills.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No upcoming bills</p>
                    <Link
                      to="/bill-types/new"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Bill Type
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBills.map((upcomingBill) => {
                      const dueDateText = getDueDateText(upcomingBill.daysUntilDue);
                      const dueDateColor = getDueDateColor(upcomingBill.daysUntilDue);

                      return (
                        <div key={upcomingBill.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: upcomingBill.color }}
                            >
                              {upcomingBill.icon}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{upcomingBill.name}</p>
                              <p className={`text-xs ${dueDateColor}`}>
                                {dueDateText}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {upcomingBill.fixed_amount ? formatAmount(parseFloat(upcomingBill.fixed_amount)) : 'Variable'}
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
