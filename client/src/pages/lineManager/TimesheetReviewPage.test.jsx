import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimesheetReviewPage from './TimesheetReviewPage.jsx'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  reviewTimesheet: vi.fn(),
  useLoaderData: vi.fn(),
  useLocation: vi.fn(),
  useMediaQuery: vi.fn(),
  useParams: vi.fn(),
  useRevalidator: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
    useLocation: mocks.useLocation,
    useNavigate: () => mocks.navigate,
    useParams: mocks.useParams,
    useRevalidator: mocks.useRevalidator,
  }
})

vi.mock('@mui/material/useMediaQuery', () => ({
  default: mocks.useMediaQuery,
}))

vi.mock('../../api/timesheets', () => ({
  reviewTimesheet: (...args) => mocks.reviewTimesheet(...args),
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

vi.mock('../../components/shared/DetailList.jsx', () => ({
  default: function MockDetailList() {
    return <div>DetailList</div>
  },
}))

vi.mock('../../components/shared/TimesheetStatusDisplay.jsx', () => ({
  default: function MockTimesheetStatusDisplay({ status }) {
    return <span>{status}</span>
  },
}))

vi.mock('../../components/shared/WeeklyMatrix.jsx', () => ({
  default: function MockWeeklyMatrix({ emptyMessage, rows }) {
    return <div>{rows.length === 0 && emptyMessage ? emptyMessage : 'WeeklyMatrix'}</div>
  },
}))

describe('TimesheetReviewPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.reviewTimesheet.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useLocation.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useParams.mockReset()
    mocks.useRevalidator.mockReset()

    mocks.useParams.mockReturnValue({ id: 'ts-1' })
    mocks.useMediaQuery.mockReturnValue(false)
    mocks.useRevalidator.mockReturnValue({ revalidate: vi.fn() })
    mocks.useLocation.mockReturnValue({
      pathname: '/manager/timesheets/ts-1',
      search: '',
      state: { returnTo: '/manager/timesheets?status=PENDING' },
    })
    mocks.useLoaderData.mockReturnValue({
      timesheet: {
        id: 'ts-1',
        consultantName: 'Pat Pending',
        weekStart: '2026-04-06',
        totalHours: 40,
        status: 'PENDING',
        workSummary: [],
        entries: [],
      },
      pendingQueue: [
        { id: 'ts-1' },
        { id: 'ts-2' },
      ],
      error: '',
    })
  })

  it('returns to the same filtered list path', () => {
    render(<TimesheetReviewPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(mocks.navigate).toHaveBeenCalledWith('/manager/timesheets?status=PENDING')
  })

  it('preserves the filtered return path when approving and moving to the next timesheet', async () => {
    mocks.reviewTimesheet.mockResolvedValue({})

    render(<TimesheetReviewPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Approve & Next' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Approve & Next' })
    )

    await waitFor(() => {
      expect(mocks.reviewTimesheet).toHaveBeenCalledWith('ts-1', {
        action: 'APPROVE',
        comment: '',
      })
    })

    expect(mocks.navigate).toHaveBeenCalledWith('/manager/timesheets/ts-2', {
      replace: true,
      state: { returnTo: '/manager/timesheets?status=PENDING' },
    })
  })

  it('shows the shared empty matrix message when a timesheet has no entries', () => {
    render(<TimesheetReviewPage />)

    expect(screen.getByText('No entries recorded for this timesheet.')).toBeInTheDocument()
  })
})
