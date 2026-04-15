import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router'
import UserManagementPage from './UserManagementPage.jsx'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUserRole: vi.fn(),
  useLoaderData: vi.fn(),
  useMediaQuery: vi.fn(),
  useRevalidator: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
    useRevalidator: mocks.useRevalidator,
  }
})

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

vi.mock('@mui/material/Select', () => ({
  default: function MockSelect({ children, label, onChange, value, ...props }) {
    return (
      <select aria-label={label} onChange={onChange} value={value} {...props}>
        {children}
      </select>
    )
  },
}))

vi.mock('@mui/material/MenuItem', () => ({
  default: function MockMenuItem({ children, value }) {
    return <option value={value}>{children}</option>
  },
}))

vi.mock('../../components/shared/PageHeader', () => ({
  default: function MockPageHeader({ children }) {
    return <div>{children}</div>
  },
}))

vi.mock('../../api/users', () => ({
  createUser: (...args) => mocks.createUser(...args),
  updateUserRole: (...args) => mocks.updateUserRole(...args),
  deleteUser: (...args) => mocks.deleteUser(...args),
}))

vi.mock('./components/CreateUserDialog.jsx', () => ({
  default: function MockCreateUserDialog() {
    return null
  },
}))

vi.mock('./components/UserList.jsx', () => ({
  default: function MockUserList({
    emptyMessage,
    getRoleLabel,
    onRoleChange,
    onSaveRole,
    pendingRoles,
    roles,
    users,
  }) {
    if (users.length === 0) {
      return <div>{emptyMessage}</div>
    }

    return (
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <span>{user.name}</span>
            <select
              aria-label={`Role for ${user.name}`}
              onChange={(event) => onRoleChange(user.id, event.target.value)}
              value={pendingRoles[user.id] ?? user.role}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
            <button onClick={() => onSaveRole(user.id)} type="button">
              Save role for {user.name}
            </button>
          </li>
        ))}
      </ul>
    )
  },
}))

vi.mock('../../context/useConfirmation.js', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}))

vi.mock('../../context/useUnsavedChanges.js', () => ({
  useUnsavedChangesGuard: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

function renderPage(initialEntry = '/admin/users?role=CONSULTANT') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <UserManagementPage />
    </MemoryRouter>
  )
}

describe('UserManagementPage', () => {
  beforeEach(() => {
    mocks.confirm.mockReset()
    mocks.createUser.mockReset()
    mocks.deleteUser.mockReset()
    mocks.updateUserRole.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useRevalidator.mockReset()

    mocks.useLoaderData.mockReturnValue({
      users: [
        { id: 'user-1', name: 'Alice Consultant', email: 'alice@example.com', role: 'CONSULTANT' },
        { id: 'user-2', name: 'Sam Admin', email: 'sam@example.com', role: 'SYSTEM_ADMIN' },
      ],
      error: '',
    })
    mocks.useMediaQuery.mockReturnValue(false)
    mocks.useRevalidator.mockReturnValue({ revalidate: vi.fn() })
  })

  it('filters locally and updates the URL without using router search params', () => {
    renderPage()

    expect(screen.getByText('Alice Consultant')).toBeInTheDocument()
    expect(screen.queryByText('Sam Admin')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'SYSTEM_ADMIN' },
    })

    expect(screen.queryByText('Alice Consultant')).not.toBeInTheDocument()
    expect(screen.getByText('Sam Admin')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('?role=SYSTEM_ADMIN')

    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'ALL' },
    })

    expect(screen.getByText('Alice Consultant')).toBeInTheDocument()
    expect(screen.getByText('Sam Admin')).toBeInTheDocument()
    expect(screen.getByTestId('location-search')).toHaveTextContent('')
  })

  it('shows success feedback after saving a role change', async () => {
    mocks.updateUserRole.mockResolvedValue({})

    renderPage('/admin/users')

    fireEvent.change(screen.getByLabelText('Role for Alice Consultant'), {
      target: { value: 'LINE_MANAGER' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save role for Alice Consultant' }))

    expect(mocks.updateUserRole).toHaveBeenCalledWith('user-1', 'LINE_MANAGER')
    expect(await screen.findByText('User role updated successfully.')).toBeInTheDocument()
  })
})
