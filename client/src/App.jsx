import {
  Route,
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfirmationProvider } from './context/ConfirmationProvider.jsx'
import { UnsavedChangesProvider } from './context/UnsavedChangesProvider.jsx'
import { useAuth } from './context/useAuth.js'
import PrivateRoute from './components/guards/PrivateRoute.jsx'
import RoleGuard from './components/guards/RoleGuard.jsx'
import AppLayout from './components/layout/AppLayout.jsx'
import { ROLE_ROUTES } from './constants/routes.js'
import LoginPage from './pages/auth/LoginPage.jsx'
import ForbiddenPage from './pages/auth/ForbiddenPage.jsx'
import TimesheetListPage from './pages/consultant/TimesheetListPage.jsx'
import TimesheetCreatePage from './pages/consultant/TimesheetCreatePage.jsx'
import TimesheetDetailPage from './pages/consultant/TimesheetDetailPage.jsx'
import TimesheetEditPage from './pages/consultant/TimesheetEditPage.jsx'
import ManagerTimesheetListPage from './pages/lineManager/ManagerTimesheetListPage.jsx'
import TimesheetReviewPage from './pages/lineManager/TimesheetReviewPage.jsx'
import FinanceTimesheetListPage from './pages/financeStaff/FinanceTimesheetListPage.jsx'
import FinancePaymentPage from './pages/financeStaff/FinancePaymentPage.jsx'
import FinancePayRatesPage from './pages/financeStaff/FinancePayRatesPage.jsx'
import UserManagementPage from './pages/admin/UserManagementPage.jsx'
import AssignmentsPage from './pages/admin/AssignmentsPage.jsx'
import AuditLogPage from './pages/admin/AuditLogPage.jsx'

function AppProviders() {
  return (
    <AuthProvider>
      <ConfirmationProvider>
        <UnsavedChangesProvider>
          <Outlet />
        </UnsavedChangesProvider>
      </ConfirmationProvider>
    </AuthProvider>
  )
}

function RootRedirect() {
  const { token, user } = useAuth()
  if (token && user) {
    return <Navigate to={ROLE_ROUTES[user.role] ?? '/login'} replace />
  }
  return <Navigate to="/login" replace />
}

const router = createBrowserRouter(createRoutesFromElements(
  <Route element={<AppProviders />}>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/403" element={<ForbiddenPage />} />
    <Route index element={<RootRedirect />} />

    <Route element={<PrivateRoute />}>
      <Route element={<AppLayout />}>
        <Route element={<RoleGuard roles={['CONSULTANT']} />}>
          <Route path="/consultant/timesheets" element={<TimesheetListPage />} />
          <Route path="/consultant/timesheets/new" element={<TimesheetCreatePage />} />
          <Route path="/consultant/timesheets/:id" element={<TimesheetDetailPage />} />
          <Route path="/consultant/timesheets/:id/edit" element={<TimesheetEditPage />} />
        </Route>

        <Route element={<RoleGuard roles={['LINE_MANAGER']} />}>
          <Route path="/manager/timesheets" element={<ManagerTimesheetListPage />} />
          <Route path="/manager/timesheets/:id" element={<TimesheetReviewPage />} />
          <Route
            path="/manager/my-timesheets"
            element={(
              <TimesheetListPage
                basePath="/manager/my-timesheets"
                title="My Timesheets"
                subtitle="Create and track your own weekly timesheets"
                timesheetScope="own"
              />
            )}
          />
          <Route
            path="/manager/my-timesheets/new"
            element={<TimesheetCreatePage basePath="/manager/my-timesheets" timesheetScope="own" />}
          />
          <Route
            path="/manager/my-timesheets/:id"
            element={<TimesheetDetailPage basePath="/manager/my-timesheets" />}
          />
          <Route
            path="/manager/my-timesheets/:id/edit"
            element={<TimesheetEditPage basePath="/manager/my-timesheets" timesheetScope="own" />}
          />
        </Route>

        <Route element={<RoleGuard roles={['FINANCE_MANAGER']} />}>
          <Route path="/finance/timesheets" element={<FinanceTimesheetListPage />} />
          <Route path="/finance/timesheets/:id" element={<FinancePaymentPage />} />
          <Route path="/finance/pay-rates" element={<FinancePayRatesPage />} />
        </Route>

        <Route element={<RoleGuard roles={['SYSTEM_ADMIN']} />}>
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/assignments" element={<AssignmentsPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />
        </Route>
      </Route>
    </Route>
  </Route>
))

export default function App() {
  return <RouterProvider router={router} />
}
