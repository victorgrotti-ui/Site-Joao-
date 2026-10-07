import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Logo } from './components/Logo'
import { useAuth } from './context/AuthContext'
import { useI18n } from './i18n'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeeProfilePage } from './pages/EmployeeProfilePage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { LoginPage } from './pages/LoginPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ProfilePage } from './pages/ProfilePage'
import { ReportsPage } from './pages/ReportsPage'
import { ServicesPage } from './pages/ServicesPage'
import { SettingsPage } from './pages/SettingsPage'

function RequireAuth() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <p className="mt-4 text-sm text-ink-muted" role="status">
            {t('login.loading')}
          </p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
