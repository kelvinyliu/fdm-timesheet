import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimesheetEditPage from './TimesheetEditPage.jsx'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  guardedNavigate: vi.fn(),
  confirm: vi.fn(),
  useLoaderData: vi.fn(),
  useLocation: vi.fn(),
  useParams: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
    useLocation: mocks.useLocation,
    useNavigate: () => mocks.navigate,
    useParams: mocks.useParams,
  }
})

vi.mock('../../context/useConfirmation.js', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}))

vi.mock('../../context/useUnsavedChanges.js', () => ({
  useGuardedNavigate: () => mocks.guardedNavigate,
  useUnsavedChangesGuard: () => {},
}))

vi.mock('../../components/shared/EditableWeeklyMatrix.jsx', () => ({
  default: function MockEditableWeeklyMatrix() {
    return <div>EditableWeeklyMatrix</div>
  },
}))

vi.mock('../../components/shared/DetailList.jsx', () => ({
  default: function MockDetailList({ items }) {
    return (
      <div>
        {items.map((item) => (
          <div key={item.key}>
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    )
  },
}))

vi.mock('../../components/shared/PageHeader', () => ({
  default: function MockPageHeader({ children, title }) {
    return (
      <div>
        <h1>{title}</h1>
        <div>{children}</div>
      </div>
    )
  },
}))

vi.mock('../../components/shared/StickyActionBar.jsx', () => ({
  default: function MockStickyActionBar({ children }) {
    return <div>{children}</div>
  },
}))

vi.mock('../../components/shared/SaveStateBanner.jsx', () => ({
  default: function MockSaveStateBanner() {
    return null
  },
}))

describe('TimesheetEditPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.guardedNavigate.mockReset()
    mocks.confirm.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useLocation.mockReset()
    mocks.useParams.mockReset()

    mocks.useParams.mockReturnValue({ id: 'ts-1' })
    mocks.useLocation.mockReturnValue({
      pathname: '/consultant/timesheets/ts-1/edit',
      search: '',
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
    mocks.useLoaderData.mockReturnValue({
      timesheet: {
        id: 'ts-1',
        entries: [],
        workSummary: [],
        weekStart: '2026-04-06',
        status: 'DRAFT',
        rejectionComment: null,
      },
      assignments: [],
      preferredAssignmentId: null,
      managerInfo: {
        manager: {
          id: 'manager-1',
          name: 'Lina Manager',
          email: 'lina@example.com',
        },
        source: 'current',
      },
      managerError: null,
      error: null,
    })
  })

  it('shows the current manager and keeps submit enabled when assigned', () => {
    render(<TimesheetEditPage />)

    expect(screen.getByText('Current Sheet Manager')).toBeInTheDocument()
    expect(screen.getByText('Lina Manager <lina@example.com>')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  it('blocks submit when no manager is assigned', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheet: {
        id: 'ts-1',
        entries: [],
        workSummary: [],
        weekStart: '2026-04-06',
        status: 'DRAFT',
        rejectionComment: null,
      },
      assignments: [],
      preferredAssignmentId: null,
      managerInfo: {
        manager: null,
        source: 'unassigned',
      },
      managerError: null,
      error: null,
    })

    render(<TimesheetEditPage />)

    expect(screen.getByText(/No manager is currently assigned/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
  })
})
