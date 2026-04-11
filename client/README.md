# FDM Timesheet - Client

React 19 frontend for the FDM Timesheet application. Built with Vite and Material UI.

---

## Technology

| Concern | Library / Tool |
|---|---|
| Framework | React 19 (with React Compiler - no manual `useMemo`/`useCallback` needed) |
| Build tool | Vite |
| UI components | Material UI (MUI) v6 |
| Routing | React Router v7 - import from `react-router` |
| HTTP client | axios (via a shared `apiClient` wrapper) |
| Date handling | dayjs |

---

## Current logins

Email / Username      | Role             | Password
----------------------|------------------|-------------
admin@demo.test       | SYSTEM_ADMIN     | admin1234
finance@demo.test     | FINANCE_MANAGER  | finance1234
alice@demo.test       | LINE_MANAGER     | alice1234
bob@demo.test         | LINE_MANAGER     | bob1234
charlie@demo.test     | CONSULTANT       | charlie1234
diana@demo.test       | CONSULTANT       | diana1234
eve@demo.test         | CONSULTANT       | eve1234
frank@demo.test       | CONSULTANT       | frank1234
grace@demo.test       | CONSULTANT       | grace1234
holly@demo.test       | CONSULTANT       | holly1234
ian@demo.test         | LINE_MANAGER     | ian12345

## Backend Communication

All API calls go through `src/api/apiClient.js`, a thin wrapper around an axios instance.

**How it works:**

1. Reads the JWT token from `localStorage` on every request.
2. Attaches `Authorization: Bearer <token>` to the request headers automatically.
3. On success, returns `response.data` (or `null` for 204 responses).
4. On failure, throws a shaped error object with `.status` (HTTP status code) and `.body` (parsed response body) so callers can handle specific error cases.

The base URL defaults to `http://localhost:3000` and can be overridden with the `VITE_API_URL` environment variable.

**Per-resource API files** in `src/api/` call `apiClient` and expose named functions:

| File | Exports |
|---|---|
| `auth.js` | `login`, `changePassword` |
| `timesheets.js` | `getTimesheets`, `getTimesheet`, `createTimesheet`, `updateEntries`, `submitTimesheet`, `autofillTimesheet`, `reviewTimesheet`, `processPayment`, `getTimesheetNotes` |
| `users.js` | `getUsers`, `createUser`, `updateUserRole`, `deleteUser` |
| `assignments.js` | `getAssignments`, `createAssignment`, `deleteAssignment`, `getManagerAssignments`, `createManagerAssignment`, `updateManagerAssignment`, `deleteManagerAssignment` |
| `audit.js` | `getAuditLog` |

---

## Authentication

### Login flow

1. User submits email and password on `LoginPage`.
2. The client calls `POST /api/auth/login`.
3. On success, the server returns a JWT and a user object.
4. `AuthProvider.login(token, user)` is called - it stores the JWT in `localStorage` and sets the in-memory `user` and `token` state.
5. The user is redirected to their role's default route (see `src/constants/routes.js`).

### Token persistence

On page load, `AuthProvider` reads `localStorage` and decodes the stored JWT. If the token is present and not expired, the session is restored without a round-trip to the server. If the token is missing or expired it is removed from storage and the user is treated as unauthenticated.

### Logout

Calling `logout()` from `useAuth` clears `localStorage`, resets state, and navigates to `/login`.

### Auth context

The auth state is split across two files to satisfy the `react-refresh/only-export-components` lint rule:

| File | Purpose |
|---|---|
| `src/context/AuthContext.jsx` | `AuthProvider` component - manages `token` and `user` state, exposes `login` and `logout` |
| `src/context/useAuth.js` | `AuthContext` object + `useAuth()` hook - import this in components |

`useAuth()` returns `{ user, token, login, logout }`. `user` contains the decoded JWT payload fields (`userId`, `role`, etc.).

---

## Routing and Route Guards

### Route structure

Routes are defined in `src/App.jsx`. All protected routes are nested inside two layers:

```
<PrivateRoute>          ← checks token exists
  <AppLayout>           ← renders sidebar + page content
    <RoleGuard roles={[...]}> ← checks user.role is allowed
      <Page />
    </RoleGuard>
  </AppLayout>
</PrivateRoute>
```

### PrivateRoute

`src/components/guards/PrivateRoute.jsx`

Checks whether a JWT token exists in auth state. If not, redirects to `/login`. Renders `<Outlet />` (the nested routes) if authenticated. Does not validate the token - expiry is handled at load time by `AuthProvider`.

### RoleGuard

`src/components/guards/RoleGuard.jsx`

Receives a `roles` prop (array of allowed role strings). Checks `user.role` against the list. If the user's role is not included, redirects to `/403`. Renders `<Outlet />` if authorised.

### Default redirect

The root path (`/`) renders `RootRedirect`, which sends authenticated users to their role's default page and unauthenticated users to `/login`. The mapping lives in `src/constants/routes.js`:

| Role | Default route |
|---|---|
| `CONSULTANT` | `/consultant/timesheets` |
| `LINE_MANAGER` | `/manager/timesheets` |
| `FINANCE_MANAGER` | `/finance/timesheets` |
| `SYSTEM_ADMIN` | `/admin/users` |

---

## Pages by Role

### Public

| Page | Path | Description |
|---|---|---|
| Login | `/login` | Email/password login form. Redirects already-authenticated users to their role's home. |
| Forbidden | `/403` | Shown when a user navigates to a route their role cannot access. |

---

### Consultant

**Required role:** `CONSULTANT`

| Page | Path | Description |
|---|---|---|
| Timesheet list | `/consultant/timesheets` | Lists all of the consultant's timesheets with status badges. Links to edit (DRAFT) or view (all other statuses). Prevents creating a new timesheet if a DRAFT or PENDING one already exists, or if a timesheet for the current week already exists. |
| Create timesheet | `/consultant/timesheets/new` | Creates a timesheet for the current week (Monday as `week_start`). Loads the consultant's client assignments for the autofill feature. Validates that no conflicting timesheet exists before submitting. |
| Edit timesheet | `/consultant/timesheets/:id/edit` | Editable view of a DRAFT or REJECTED timesheet. Displays one hours field per day of the week, along with the latest manager feedback when present. Supports saving without submitting, submitting for review, and autofilling hours from the previous week. |
| View timesheet | `/consultant/timesheets/:id` | Read-only view of a submitted/reviewed timesheet. Shows hours per day, weekly total, status, and the latest manager feedback when present. |

---

### Line Manager

**Required role:** `LINE_MANAGER`

| Page | Path | Description |
|---|---|---|
| Team timesheets | `/manager/timesheets` | Lists timesheets for all consultants assigned to this manager. Uses `Open Timesheet` actions to access the full detail view. |
| Open timesheet | `/manager/timesheets/:id` | Shows full timesheet detail. Allows approving or rejecting. A rejection comment is required. Calls `PATCH /api/timesheets/:id/review`. |

---

### Finance Manager

**Required role:** `FINANCE_MANAGER`

| Page | Path | Description |
|---|---|---|
| Timesheets for payment | `/finance/timesheets` | Lists timesheets with APPROVED or COMPLETED status. `COMPLETED` is displayed in the UI as `Paid`. |
| Payment page | `/finance/timesheets/:id` | Shows timesheet details and hours worked. Accepts an hourly rate (£/hr) and optional payment notes. Calculates the total payment (`hourlyRate × totalHours`) and submits via `POST /api/timesheets/:id/payment`. Once processed, the UI displays the timesheet status as `Paid` and shows finance notes. |

---

### System Admin

**Required role:** `SYSTEM_ADMIN`

| Page | Path | Description |
|---|---|---|
| User management | `/admin/users` | Lists all users. Allows creating new users (name, email, password, role), changing a user's role, and deleting users. |
| Assignments | `/admin/assignments` | Two sections: (1) client assignments - link a consultant to a client with start/end dates; (2) manager assignments - assign a consultant to a line manager. Client assignments support create and delete; manager assignments support create, edit, and delete. |
| Audit log | `/admin/audit` | Append-only log of all significant system events (SUBMISSION, APPROVAL, REJECTION, PROCESSING). Filterable by action type, author, and date range. |

---

## Layout

Authenticated pages render inside `AppLayout` (`src/components/layout/AppLayout.jsx`), which provides:

- A **sidebar** (`Sidebar.jsx`) with navigation links scoped to the current user's role. The sidebar also displays the user's role label and a change-password option.
- A **header** (`Header.jsx`) with the app title and logout button.
- A main content area where the active page renders via `<Outlet />`.

---

## Running the Client

```bash
cd client
npm install
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build
npm run lint      # ESLint
```

Set `VITE_API_URL` in a `.env` file if the backend is not running on `http://localhost:3000`.
