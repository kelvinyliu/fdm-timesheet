import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import TimesheetListPage from './TimesheetListPage.jsx'

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

describe('TimesheetListPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useMediaQuery.mockReturnValue(false)
  })

  it('counts approved and completed timesheets together in the approved / paid summary tile', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-draft',
          weekStart: '2026-04-06',
          totalHours: 8,
          status: 'DRAFT',
          workSummary: [],
        },
        {
          id: 'ts-pending',
          weekStart: '2026-04-06',
          totalHours: 40,
          status: 'PENDING',
          workSummary: [],
        },
        {
          id: 'ts-rejected',
          weekStart: '2026-04-06',
          totalHours: 32,
          status: 'REJECTED',
          workSummary: [],
        },
        {
          id: 'ts-approved',
          weekStart: '2026-04-13',
          totalHours: 37.5,
          status: 'APPROVED',
          workSummary: [],
        },
        {
          id: 'ts-completed',
          weekStart: '2026-04-20',
          totalHours: 41,
          status: 'COMPLETED',
          workSummary: [],
        },
      ],
      eligibility: {
        currentWeekStart: '2026-04-27',
        missingPastWeekStarts: [],
      },
      error: null,
      eligibilityError: null,
    })

    render(
      <MemoryRouter initialEntries={['/consultant/timesheets']}>
        <TimesheetListPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'New Timesheet' })).toBeInTheDocument()

    expect(within(screen.getByText('Drafts').closest('div')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Pending').closest('div')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Rejected').closest('div')).getByText('1')).toBeInTheDocument()
    expect(
      within(screen.getByText('Approved / Paid').closest('div')).getByText('2')
    ).toBeInTheDocument()
  })

  it('preserves the selected tab in navigation state when leaving the list', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-completed',
          weekStart: '2026-04-20',
          totalHours: 41,
          status: 'COMPLETED',
          workSummary: [],
        },
      ],
      eligibility: {
        currentWeekStart: '2026-04-27',
        missingPastWeekStarts: [],
      },
      error: null,
      eligibilityError: null,
    })

    render(
      <MemoryRouter initialEntries={['/consultant/timesheets?tab=history']}>
        <TimesheetListPage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'View' }))

    expect(mocks.navigate).toHaveBeenCalledWith('/consultant/timesheets/ts-completed', {
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
  })

  it('treats the legacy approved tab query as the approved and paid tab', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-completed',
          weekStart: '2026-04-20',
          totalHours: 41,
          status: 'COMPLETED',
          workSummary: [],
        },
      ],
      eligibility: {
        currentWeekStart: '2026-04-27',
        missingPastWeekStarts: [],
      },
      error: null,
      eligibilityError: null,
    })

    render(
      <MemoryRouter initialEntries={['/consultant/timesheets?tab=approved']}>
        <TimesheetListPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'View' })).toBeInTheDocument()
  })
})
