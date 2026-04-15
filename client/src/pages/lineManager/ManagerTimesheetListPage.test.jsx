import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import ManagerTimesheetListPage from './ManagerTimesheetListPage.jsx'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useLoaderData: vi.fn(),
  useMediaQuery: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
    useNavigate: () => mocks.navigate,
  }
})

function renderAt(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ManagerTimesheetListPage />
    </MemoryRouter>
  )
}

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
  default: function MockPageHeader({ children, title }) {
    return (
      <div>
        <h1>{title}</h1>
        <div>{children}</div>
      </div>
    )
  },
}))

vi.mock('../../components/shared/TimesheetStatusDisplay.jsx', () => ({
  default: function MockTimesheetStatusDisplay({ status }) {
    return <span>{status}</span>
  },
}))

describe('ManagerTimesheetListPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()

    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-pending',
          consultantName: 'Pat Pending',
          weekStart: '2026-04-06',
          totalHours: 40,
          status: 'PENDING',
        },
        {
          id: 'ts-approved',
          consultantName: 'Amy Approved',
          weekStart: '2026-04-06',
          totalHours: 38,
          status: 'APPROVED',
        },
        {
          id: 'ts-completed',
          consultantName: 'Casey Completed',
          weekStart: '2026-04-13',
          totalHours: 41,
          status: 'COMPLETED',
        },
        {
          id: 'ts-finance-returned',
          consultantName: 'Fiona Finance',
          weekStart: '2026-04-14',
          totalHours: 39,
          status: 'FINANCE_REJECTED',
        },
        {
          id: 'ts-rejected',
          consultantName: 'Riley Rejected',
          weekStart: '2026-04-13',
          totalHours: 36,
          status: 'REJECTED',
        },
      ],
      error: '',
    })
    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('initializes the rejected filter from the URL', () => {
    renderAt('/manager/timesheets?status=REJECTED')

    expect(screen.getByRole('heading', { name: 'Rejected Timesheets' })).toBeInTheDocument()
    expect(screen.getByText('Riley Rejected')).toBeInTheDocument()
    expect(screen.queryByText('Pat Pending')).not.toBeInTheDocument()
    expect(screen.queryByText('Amy Approved')).not.toBeInTheDocument()
    expect(screen.queryByText('Casey Completed')).not.toBeInTheDocument()
  })

  it('maps the legacy approved query param to the combined approved view', () => {
    renderAt('/manager/timesheets?status=APPROVED')

    expect(screen.getByRole('heading', { name: 'Approved Timesheets' })).toBeInTheDocument()
    expect(screen.getByText('Amy Approved')).toBeInTheDocument()
    expect(screen.getByText('Casey Completed')).toBeInTheDocument()
    expect(screen.queryByText('Pat Pending')).not.toBeInTheDocument()
    expect(screen.queryByText('Riley Rejected')).not.toBeInTheDocument()
  })

  it('falls back to all for invalid status values and preserves the selected filter on open', () => {
    renderAt('/manager/timesheets?status=UNKNOWN')

    expect(screen.getByRole('heading', { name: 'Team Timesheets' })).toBeInTheDocument()
    expect(screen.getByText('Pat Pending')).toBeInTheDocument()
    expect(screen.getByText('Amy Approved')).toBeInTheDocument()
    expect(screen.getByText('Casey Completed')).toBeInTheDocument()
    expect(screen.getByText('Riley Rejected')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'PENDING' },
    })

    expect(screen.getByRole('heading', { name: 'Pending Timesheets' })).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Open Timesheet' })[0])

    expect(mocks.navigate).toHaveBeenCalledWith('/manager/timesheets/ts-pending', {
      state: { returnTo: '/manager/timesheets?status=PENDING' },
    })
  })

  it('preserves the search query on open', () => {
    renderAt('/manager/timesheets?status=PENDING&q=Pat')

    expect(screen.getByRole('heading', { name: 'Pending Timesheets' })).toBeInTheDocument()
    expect(screen.getByText('Pat Pending')).toBeInTheDocument()
    expect(screen.queryByText('Amy Approved')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open Timesheet' }))

    expect(mocks.navigate).toHaveBeenCalledWith('/manager/timesheets/ts-pending', {
      state: { returnTo: '/manager/timesheets?status=PENDING&q=Pat' },
    })
  })

  it('includes finance-returned sheets in the pending manager view', () => {
    renderAt('/manager/timesheets?status=PENDING')

    expect(screen.getByText('Pat Pending')).toBeInTheDocument()
    expect(screen.getByText('Fiona Finance')).toBeInTheDocument()
  })

  it('omits the draft summary tile for hidden manager drafts', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-draft',
          consultantName: 'Dana Draft',
          weekStart: '2026-04-06',
          totalHours: 0,
          status: 'DRAFT',
        },
        {
          id: 'ts-pending',
          consultantName: 'Pat Pending',
          weekStart: '2026-04-06',
          totalHours: 40,
          status: 'PENDING',
        },
      ],
      error: '',
    })

    renderAt('/manager/timesheets')

    expect(screen.queryByText('Drafts')).not.toBeInTheDocument()
    expect(screen.queryByText('Dana Draft')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'All Timesheets (1)' })).toBeInTheDocument()
  })
})
