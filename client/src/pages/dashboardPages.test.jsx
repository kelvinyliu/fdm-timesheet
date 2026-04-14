import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConsultantDashboard from './consultant/ConsultantDashboard.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import ManagerDashboard from './lineManager/ManagerDashboard.jsx'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useLoaderData: vi.fn(),
  useAuth: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    useLoaderData: mocks.useLoaderData,
  }
})

vi.mock('../context/useAuth', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('../utils/dateFormatters', async () => {
  const actual = await vi.importActual('../utils/dateFormatters')
  return {
    ...actual,
    getCurrentMonday: vi.fn(() => '2026-04-13'),
  }
})

describe('dashboard pages', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useAuth.mockReset()
    mocks.useAuth.mockReturnValue({ user: { name: 'Alex Consultant' } })
  })

  it('renders consultant dashboard content from loader data and shows loader errors inline', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-1',
          status: 'DRAFT',
          weekStart: '2026-04-06',
          updatedAt: '2026-04-07T10:00:00.000Z',
          totalHours: 8,
        },
      ],
      error: 'Overview unavailable',
    })

    render(<ConsultantDashboard />)

    expect(screen.getByText('Overview unavailable')).toBeInTheDocument()
    expect(screen.getByText('Drafts')).toBeInTheDocument()
    expect(screen.getByText('Recent timesheets')).toBeInTheDocument()
    expect(screen.getByText('8.00 hrs (Editable)')).toBeInTheDocument()
  })

  it('formats consultant financial summaries in GBP and bases utilization on the current week', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        {
          id: 'ts-current',
          status: 'APPROVED',
          weekStart: '2026-04-13',
          updatedAt: '2026-04-14T09:00:00.000Z',
          totalHours: 32,
          totalBillAmount: 1200,
        },
        {
          id: 'ts-older-edited',
          status: 'REJECTED',
          weekStart: '2026-04-06',
          updatedAt: '2026-04-15T09:00:00.000Z',
          totalHours: 8,
          totalBillAmount: 0,
        },
        {
          id: 'ts-pending',
          status: 'PENDING',
          weekStart: '2026-04-20',
          updatedAt: '2026-04-12T09:00:00.000Z',
          totalHours: 40,
          totalBillAmount: 500,
        },
        {
          id: 'ts-paid',
          status: 'COMPLETED',
          weekStart: '2026-04-01',
          updatedAt: '2026-04-02T09:00:00.000Z',
          totalHours: 20,
          totalBillAmount: 800,
        },
      ],
      error: null,
    })

    render(<ConsultantDashboard />)

    expect(screen.getByText('£2,000.00')).toBeInTheDocument()
    expect(screen.getByText('£1,700.00')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('32 / 40 hrs')).toBeInTheDocument()
  })

  it('renders admin dashboard summary cards from loader data', () => {
    mocks.useLoaderData.mockReturnValue({
      users: [
        { id: 'u1', role: 'CONSULTANT' },
        { id: 'u2', role: 'LINE_MANAGER' },
      ],
      auditLog: [{ id: 'a1', action: 'SUBMISSION', createdAt: '2026-04-11T09:00:00.000Z' }],
      error: null,
    })

    render(<AdminDashboard />)

    expect(screen.getByText('Platform overview')).toBeInTheDocument()
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getByText('Timesheet submitted')).toBeInTheDocument()
  })

  it('renders the admin dashboard empty-users path without NaN role widths', () => {
    mocks.useLoaderData.mockReturnValue({
      users: [],
      auditLog: [],
      error: 'Users unavailable',
    })

    render(<AdminDashboard />)

    expect(screen.getByText('Users unavailable')).toBeInTheDocument()
    expect(screen.getByText('Role distribution')).toBeInTheDocument()
    expect(document.head.innerHTML).not.toContain('NaN%')
  })

  it('routes the manager approved card to the combined approved filter', () => {
    mocks.useLoaderData.mockReturnValue({
      timesheets: [
        { id: 'ts-1', status: 'APPROVED' },
        { id: 'ts-2', status: 'COMPLETED' },
      ],
      error: null,
    })

    render(<ManagerDashboard />)

    fireEvent.click(screen.getByText('Approved'))

    expect(mocks.navigate).toHaveBeenCalledWith('/manager/timesheets?status=APPROVED_GROUP')
  })
})
