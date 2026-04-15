import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimesheetDetailPage from './TimesheetDetailPage.jsx'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
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
  default: function MockWeeklyMatrix() {
    return <div>WeeklyMatrix</div>
  },
}))

describe('TimesheetDetailPage', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useLocation.mockReset()
    mocks.useParams.mockReset()

    mocks.useParams.mockReturnValue({ id: 'ts-1' })
    mocks.useLocation.mockReturnValue({
      pathname: '/consultant/timesheets/ts-1',
      search: '',
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
    mocks.useLoaderData.mockReturnValue({
      error: null,
      timesheet: {
        id: 'ts-1',
        entries: [],
        consultantName: 'Pat Pending',
        status: 'REJECTED',
        submittedLate: false,
        totalHours: 40,
        weekStart: '2026-04-06',
        workSummary: [],
      },
    })
  })

  it('uses the preserved return path for back and edit navigation', () => {
    render(<TimesheetDetailPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(mocks.navigate).toHaveBeenCalledWith('/consultant/timesheets?tab=history')

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(mocks.navigate).toHaveBeenCalledWith('/consultant/timesheets/ts-1/edit', {
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
  })
})
