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
    expect(screen.getByText('8 hrs (Editable)')).toBeInTheDocument()
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

    expect(screen.getByText('Admin overview')).toBeInTheDocument()
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
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
