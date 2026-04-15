import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimesheetCreatePage from './TimesheetCreatePage.jsx'

const mocks = vi.hoisted(() => ({
  createTimesheet: vi.fn(),
  navigate: vi.fn(),
  useLoaderData: vi.fn(),
  useLocation: vi.fn(),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: mocks.useLoaderData,
    useLocation: mocks.useLocation,
    useNavigate: () => mocks.navigate,
  }
})

vi.mock('../../api/timesheets', () => ({
  createTimesheet: (...args) => mocks.createTimesheet(...args),
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

describe('TimesheetCreatePage', () => {
  beforeEach(() => {
    mocks.createTimesheet.mockReset()
    mocks.navigate.mockReset()
    mocks.useLoaderData.mockReset()
    mocks.useLocation.mockReset()

    mocks.useLoaderData.mockReturnValue({
      weekStart: '2026-04-27',
      error: null,
    })
    mocks.useLocation.mockReturnValue({
      pathname: '/consultant/timesheets/new',
      search: '',
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
  })

  it('uses the preserved return path for back and cancel', () => {
    render(<TimesheetCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(mocks.navigate).toHaveBeenNthCalledWith(1, '/consultant/timesheets?tab=history')
    expect(mocks.navigate).toHaveBeenNthCalledWith(2, '/consultant/timesheets?tab=history')
  })

  it('passes the preserved return path into the edit screen after creation', async () => {
    mocks.createTimesheet.mockResolvedValue({ id: 'ts-2' })

    render(<TimesheetCreatePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Timesheet' }))

    await waitFor(() => {
      expect(mocks.createTimesheet).toHaveBeenCalledWith({ weekStart: '2026-04-27' })
    })

    expect(mocks.navigate).toHaveBeenCalledWith('/consultant/timesheets/ts-2/edit', {
      replace: true,
      state: { returnTo: '/consultant/timesheets?tab=history' },
    })
  })
})
