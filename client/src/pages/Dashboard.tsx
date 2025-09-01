import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.loginName}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your bills and expenses.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">$</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Total Expenses</h3>
              <p className="text-2xl font-bold text-gray-700">$2,450.00</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Bills Paid</h3>
              <p className="text-2xl font-bold text-gray-700">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">!</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Pending Bills</h3>
              <p className="text-2xl font-bold text-gray-700">3</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-medium">#</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Categories</h3>
              <p className="text-2xl font-bold text-gray-700">12</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity and upcoming bills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-medium">E</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Electricity Bill</p>
                    <p className="text-xs text-gray-500">Paid 2 days ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$125.00</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-green-600 text-xs font-medium">G</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Groceries</p>
                    <p className="text-xs text-gray-500">Added 3 days ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$89.50</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 text-xs font-medium">I</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Internet Bill</p>
                    <p className="text-xs text-gray-500">Paid 5 days ago</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$60.00</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Upcoming Bills</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <span className="text-red-600 text-xs font-medium">R</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Rent</p>
                    <p className="text-xs text-red-500">Due in 2 days</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$1,200.00</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-yellow-600 text-xs font-medium">C</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Credit Card</p>
                    <p className="text-xs text-yellow-500">Due in 5 days</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$450.00</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-medium">P</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Phone Bill</p>
                    <p className="text-xs text-blue-500">Due in 1 week</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900">$75.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
