import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FinancePaymentPage from './FinancePaymentPage.jsx'

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  financeReviewTimesheet: vi.fn(),
  guardedNavigate: vi.fn(),
  navigate: vi.fn(),
  processPayment: vi.fn(),
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

vi.mock('./PaymentDetailsPanel.jsx', () => ({
  default: function MockPaymentDetailsPanel({ onOpenReturnDialog }) {
    return (
      <div>
        <div>PaymentDetailsPanel</div>
        <button type="button" onClick={onOpenReturnDialog}>
          Send Back to Manager
        </button>
      </div>
    )
  },
}))

vi.mock('./FinanceNotesPanel.jsx', () => ({
  default: function MockFinanceNotesPanel() {
    return <div>FinanceNotesPanel</div>
  },
}))

vi.mock('../../context/useConfirmation.js', () => ({
  useConfirmation: () => ({ confirm: mocks.confirm }),
}))

vi.mock('../../context/useUnsavedChanges.js', () => ({
  useGuardedNavigate: () => mocks.guardedNavigate,
  useUnsavedChangesGuard: vi.fn(),
}))

vi.mock('../../api/timesheets', () => ({
  financeReviewTimesheet: (...args) => mocks.financeReviewTimesheet(...args),
  processPayment: (...args) => mocks.processPayment(...args),
}))

describe('FinancePaymentPage', () => {
  beforeEach(() => {
    mocks.confirm.mockReset()
    mocks.financeReviewTimesheet.mockReset()
    mocks.guardedNavigate.mockReset()
    mocks.navigate.mockReset()
    mocks.processPayment.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useLocation.mockReset()
    mocks.useMediaQuery.mockReset()
    mocks.useParams.mockReset()
    mocks.useRevalidator.mockReset()

    mocks.useParams.mockReturnValue({ id: 'ts-1' })
    mocks.useMediaQuery.mockReturnValue(false)
    mocks.useRevalidator.mockReturnValue({ revalidate: vi.fn() })
    mocks.useLocation.mockReturnValue({
      pathname: '/finance/timesheets/ts-1',
      search: '',
      state: null,
    })
    mocks.useLoaderData.mockReturnValue({
      approvedQueue: [],
      error: '',
      fetchedNotes: '',
      timesheet: {
        id: 'ts-1',
        consultantName: 'Pat Pending',
        entries: [],
        status: 'APPROVED',
        submittedLate: false,
        totalHours: 0,
        weekStart: '2026-04-06',
        workSummary: [],
      },
    })
  })

  it('shows the shared empty matrix message when a timesheet has no entries', () => {
    render(<FinancePaymentPage />)

    expect(screen.getByText('No entries recorded for this timesheet.')).toBeInTheDocument()
  })

  it('shows the return-to-manager action for approved timesheets', () => {
    render(<FinancePaymentPage />)

    expect(screen.getByRole('button', { name: 'Send Back to Manager' })).toBeInTheDocument()
  })

  it('confirms before sending a timesheet back to the line manager', async () => {
    mocks.confirm.mockResolvedValue('confirm')
    mocks.financeReviewTimesheet.mockResolvedValue({})

    render(<FinancePaymentPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Send Back to Manager' }))
    fireEvent.change(screen.getByLabelText('Return comment'), {
      target: { value: 'Rates need another manager review.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review send back' }))

    await waitFor(() => {
      expect(mocks.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Send this timesheet back to the line manager?',
          confirmLabel: 'Send back to manager',
          variant: 'danger',
          summaryItems: expect.arrayContaining([
            expect.objectContaining({ label: 'Return comment', value: 'Rates need another manager review.' }),
          ]),
        })
      )
    })

    await waitFor(() => {
      expect(mocks.financeReviewTimesheet).toHaveBeenCalledWith('ts-1', {
        action: 'RETURN',
        comment: 'Rates need another manager review.',
      })
    })
  })
})
