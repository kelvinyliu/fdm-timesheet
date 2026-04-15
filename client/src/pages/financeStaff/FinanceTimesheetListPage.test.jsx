import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import FinanceTimesheetListPage from './FinanceTimesheetListPage.jsx'

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

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

vi.mock('../../components/shared/PageHeader', () => ({
  default: function MockPageHeader({ children, title, subtitle }) {
    return (
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
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

describe('FinanceTimesheetListPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()

    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('derives summary card counts from all timesheets while listing only approved items on the to-pay tab', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-draft',
          consultantName: 'Dana Draft',
          status: 'DRAFT',
          totalHours: 8,
          weekStart: '2026-04-06',
        },
        {
          id: 'ts-pending',
          consultantName: 'Perry Pending',
          status: 'PENDING',
          totalHours: 40,
          weekStart: '2026-04-06',
        },
        {
          id: 'ts-rejected',
          consultantName: 'Riley Rejected',
          status: 'REJECTED',
          totalHours: 32,
          weekStart: '2026-04-06',
        },
        {
          id: 'ts-approved',
          consultantName: 'Avery Approved',
          status: 'APPROVED',
          totalHours: 37.5,
          weekStart: '2026-04-13',
        },
        {
          id: 'ts-completed',
          consultantName: 'Casey Completed',
          status: 'COMPLETED',
          totalHours: 41,
          weekStart: '2026-04-20',
        },
      ],
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/finance/timesheets']}>
        <FinanceTimesheetListPage />
      </MemoryRouter>
    )

    expect(within(screen.getByText('Drafts').closest('div')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Pending').closest('div')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Rejected').closest('div')).getByText('1')).toBeInTheDocument()
    expect(
      within(screen.getByText('Approved / Paid').closest('div')).getByText('2')
    ).toBeInTheDocument()

    expect(screen.getByText('Avery Approved')).toBeInTheDocument()
    expect(screen.queryByText('Dana Draft')).not.toBeInTheDocument()
    expect(screen.queryByText('Perry Pending')).not.toBeInTheDocument()
    expect(screen.queryByText('Riley Rejected')).not.toBeInTheDocument()
    expect(screen.queryByText('Casey Completed')).not.toBeInTheDocument()
  })

  it('preserves tab, search, and sort params in the return path when opening a paid timesheet', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-approved',
          consultantName: 'Avery Approved',
          status: 'APPROVED',
          totalHours: 37.5,
          weekStart: '2026-04-13',
        },
        {
          id: 'ts-completed',
          consultantName: 'Casey Completed',
          status: 'COMPLETED',
          totalHours: 41,
          weekStart: '2026-04-20',
        },
      ],
      error: null,
    })

    render(
      <MemoryRouter initialEntries={['/finance/timesheets?tab=paid&q=Casey&sort=hoursHigh']}>
        <FinanceTimesheetListPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(mocks.navigate).toHaveBeenCalledWith('/finance/timesheets/ts-completed', {
      state: { returnTo: '/finance/timesheets?tab=paid&q=Casey&sort=hoursHigh' },
    })
  })
})
