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
import {
  adminDashboardLoader,
  assignmentsLoader,
  auditLogLoader,
  consultantDashboardLoader,
  createTimesheetCreateLoader,
  createTimesheetEditLoader,
  createTimesheetListLoader,
  financeDashboardLoader,
  financePayRatesLoader,
  financePaymentLoader,
  financeTimesheetListLoader,
  managerDashboardLoader,
  managerTimesheetListLoader,
  timesheetDetailLoader,
  timesheetReviewLoader,
  userManagementLoader,
} from './routes/loaders.js'

function lazyPage(importPage, props = {}, loader) {
  return async () => {
    const module = await importPage()
    const Page = module.default
    const route = {
      Component: () => <Page {...props} />,
    }

    if (loader) route.loader = loader

    return route
  }
}

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

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppProviders />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route index element={<RootRedirect />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard roles={['CONSULTANT']} />}>
            <Route
              path="/consultant/dashboard"
              lazy={lazyPage(
                () => import('./pages/consultant/ConsultantDashboard.jsx'),
                {},
                consultantDashboardLoader
              )}
            />
            <Route
              path="/consultant/timesheets"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetListPage.jsx'),
                {},
                createTimesheetListLoader()
              )}
            />
            <Route
              path="/consultant/timesheets/new"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetCreatePage.jsx'),
                {},
                createTimesheetCreateLoader()
              )}
            />
            <Route
              path="/consultant/timesheets/:id"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetDetailPage.jsx'),
                {},
                timesheetDetailLoader
              )}
            />
            <Route
              path="/consultant/timesheets/:id/edit"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetEditPage.jsx'),
                {},
                createTimesheetEditLoader()
              )}
            />
          </Route>

          <Route element={<RoleGuard roles={['LINE_MANAGER']} />}>
            <Route
              path="/manager/dashboard"
              lazy={lazyPage(
                () => import('./pages/lineManager/ManagerDashboard.jsx'),
                {},
                managerDashboardLoader
              )}
            />
            <Route
              path="/manager/timesheets"
              lazy={lazyPage(
                () => import('./pages/lineManager/ManagerTimesheetListPage.jsx'),
                {},
                managerTimesheetListLoader
              )}
            />
            <Route
              path="/manager/timesheets/:id"
              lazy={lazyPage(
                () => import('./pages/lineManager/TimesheetReviewPage.jsx'),
                {},
                timesheetReviewLoader
              )}
            />
            <Route
              path="/manager/my-timesheets"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetListPage.jsx'),
                {
                  basePath: '/manager/my-timesheets',
                  title: 'My Timesheets',
                  subtitle: 'Create and track your own weekly timesheets',
                  timesheetScope: 'own',
                },
                createTimesheetListLoader({ timesheetScope: 'own' })
              )}
            />
            <Route
              path="/manager/my-timesheets/new"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetCreatePage.jsx'),
                {
                  basePath: '/manager/my-timesheets',
                  timesheetScope: 'own',
                },
                createTimesheetCreateLoader({
                  basePath: '/manager/my-timesheets',
                  timesheetScope: 'own',
                })
              )}
            />
            <Route
              path="/manager/my-timesheets/:id"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetDetailPage.jsx'),
                {
                  basePath: '/manager/my-timesheets',
                },
                timesheetDetailLoader
              )}
            />
            <Route
              path="/manager/my-timesheets/:id/edit"
              lazy={lazyPage(
                () => import('./pages/consultant/TimesheetEditPage.jsx'),
                {
                  basePath: '/manager/my-timesheets',
                  timesheetScope: 'own',
                },
                createTimesheetEditLoader({
                  basePath: '/manager/my-timesheets',
                  timesheetScope: 'own',
                })
              )}
            />
          </Route>

          <Route element={<RoleGuard roles={['FINANCE_MANAGER']} />}>
            <Route
              path="/finance/dashboard"
              lazy={lazyPage(
                () => import('./pages/financeStaff/FinanceDashboard.jsx'),
                {},
                financeDashboardLoader
              )}
            />
            <Route
              path="/finance/timesheets"
              lazy={lazyPage(
                () => import('./pages/financeStaff/FinanceTimesheetListPage.jsx'),
                {},
                financeTimesheetListLoader
              )}
            />
            <Route
              path="/finance/timesheets/:id"
              lazy={lazyPage(
                () => import('./pages/financeStaff/FinancePaymentPage.jsx'),
                {},
                financePaymentLoader
              )}
            />
            <Route
              path="/finance/pay-rates"
              lazy={lazyPage(
                () => import('./pages/financeStaff/FinancePayRatesPage.jsx'),
                {},
                financePayRatesLoader
              )}
            />
          </Route>

          <Route element={<RoleGuard roles={['SYSTEM_ADMIN']} />}>
            <Route
              path="/admin/dashboard"
              lazy={lazyPage(
                () => import('./pages/admin/AdminDashboard.jsx'),
                {},
                adminDashboardLoader
              )}
            />
            <Route
              path="/admin/users"
              lazy={lazyPage(
                () => import('./pages/admin/UserManagementPage.jsx'),
                {},
                userManagementLoader
              )}
            />
            <Route
              path="/admin/assignments"
              lazy={lazyPage(
                () => import('./pages/admin/AssignmentsPage.jsx'),
                {},
                assignmentsLoader
              )}
            />
            <Route
              path="/admin/audit"
              lazy={lazyPage(() => import('./pages/admin/AuditLogPage.jsx'), {}, auditLogLoader)}
            />
          </Route>
        </Route>
      </Route>
    </Route>
  )
)

export default function App() {
  return <RouterProvider router={router} />
}
