import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SettingsPage from './pages/SettingsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DevicesPage from './pages/DevicesPage'
import WalletsPage from './pages/WalletsPage'
import WalletFormPage from './pages/WalletFormPage'
import PaymentsPage from './pages/PaymentsPage'
import PaymentFormPage from './pages/PaymentFormPage'
import ExpenseTypesPage from './pages/ExpenseTypesPage'
import ExpenseTypeFormPage from './pages/ExpenseTypeFormPage'
import ExpensesPage from './pages/ExpensesPage'
import ExpenseFormPage from './pages/ExpenseFormPage'
import BatchCreateTypesPage from './pages/BatchCreateTypesPage'
import Dashboard from './pages/Dashboard'
import DueItemsPage from './pages/DueItemsPage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/due-items" element={<DueItemsPage />} />
        <Route path="/wallets" element={<WalletsPage />} />
        <Route path="/wallets/new" element={<WalletFormPage />} />
        <Route path="/wallets/:id" element={<WalletFormPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/new" element={<PaymentFormPage />} />
        <Route path="/payments/:id" element={<PaymentFormPage />} />
        <Route path="/expense-types" element={<ExpenseTypesPage />} />
        <Route path="/expense-types/new" element={<ExpenseTypeFormPage />} />
        <Route path="/expense-types/:id" element={<ExpenseTypeFormPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id" element={<ExpenseFormPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/devices" element={<DevicesPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/batch-create-types" element={<BatchCreateTypesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HomeRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingScreen message="Restoring your session" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return <LoadingScreen message="Preparing authentication" />
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="loading-shell">
      <div className="loading-orb" />
      <p>{message}</p>
    </main>
  )
}