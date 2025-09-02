import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import SettingsPage from './pages/SettingsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import BillTypesPage from './pages/BillTypesPage'
import BillTypeFormPage from './pages/BillTypeFormPage'
import BillPaymentsPage from './pages/BillPaymentsPage'
import BillPaymentFormPage from './pages/BillPaymentFormPage'
import ExpenseTypesPage from './pages/ExpenseTypesPage'
import ExpenseTypeFormPage from './pages/ExpenseTypeFormPage'
import ExpenseItemsPage from './pages/ExpenseItemsPage'
import ExpenseItemFormPage from './pages/ExpenseItemFormPage'
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bill-types" element={<BillTypesPage />} />
                <Route path="/bill-types/new" element={<BillTypeFormPage />} />
                <Route path="/bill-types/:id/edit" element={<BillTypeFormPage />} />
                <Route path="/bill-payments" element={<BillPaymentsPage />} />
                <Route path="/bill-payments/new" element={<BillPaymentFormPage />} />
                <Route path="/bill-payments/:id/edit" element={<BillPaymentFormPage />} />
                <Route path="/expense-types" element={<ExpenseTypesPage />} />
                <Route path="/expense-types/new" element={<ExpenseTypeFormPage />} />
                <Route path="/expense-types/:id/edit" element={<ExpenseTypeFormPage />} />
                <Route path="/expense-items" element={<ExpenseItemsPage />} />
                <Route path="/expense-items/new" element={<ExpenseItemFormPage />} />
                <Route path="/expense-items/:id/edit" element={<ExpenseItemFormPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
              </Routes>
            </Layout>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
