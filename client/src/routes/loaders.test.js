import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  adminDashboardLoader,
  assignmentsLoader,
  auditLogLoader,
  consultantDashboardLoader,
  createTimesheetCreateLoader,
  createTimesheetEditLoader,
  createTimesheetListLoader,
  financeTimesheetListLoader,
} from './loaders.js'

const mocks = vi.hoisted(() => ({
  getAllAssignments: vi.fn(),
  getAssignments: vi.fn(),
  getManagerAssignments: vi.fn(),
  getAuditLog: vi.fn(),
  getEligibleWeeks: vi.fn(),
  getTimesheet: vi.fn(),
  getTimesheetNotes: vi.fn(),
  getTimesheets: vi.fn(),
  getSubmitterPayRates: vi.fn(),
  getUsers: vi.fn(),
  getCurrentMonday: vi.fn(),
}))

vi.mock('../api/assignments.js', () => ({
  getAllAssignments: mocks.getAllAssignments,
  getAssignments: mocks.getAssignments,
  getManagerAssignments: mocks.getManagerAssignments,
}))

vi.mock('../api/audit.js', () => ({
  getAuditLog: mocks.getAuditLog,
}))

vi.mock('../api/timesheets.js', () => ({
  getEligibleWeeks: mocks.getEligibleWeeks,
  getTimesheet: mocks.getTimesheet,
  getTimesheetNotes: mocks.getTimesheetNotes,
  getTimesheets: mocks.getTimesheets,
}))

vi.mock('../api/users.js', () => ({
  getSubmitterPayRates: mocks.getSubmitterPayRates,
  getUsers: mocks.getUsers,
}))

vi.mock('../utils/dateFormatters.js', () => ({
  getCurrentMonday: mocks.getCurrentMonday,
}))

function createRequest(path = '/test') {
  return new Request(`http://localhost${path}`)
}

describe('route loaders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentMonday.mockReturnValue('2026-04-06')
  })

  it('loads consultant timesheets and missing-week eligibility together', async () => {
    const request = createRequest('/manager/my-timesheets')
    const loader = createTimesheetListLoader({ timesheetScope: 'own' })
    const timesheets = [{ id: 'ts-1' }]
    const eligibility = {
      currentWeekStart: '2026-04-06',
      missingPastWeekStarts: ['2026-03-30'],
    }

    mocks.getTimesheets.mockResolvedValue(timesheets)
    mocks.getEligibleWeeks.mockResolvedValue(eligibility)

    await expect(loader({ request })).resolves.toEqual({
      timesheets,
      eligibility,
      error: null,
      eligibilityError: null,
    })
    expect(mocks.getTimesheets).toHaveBeenCalledWith({ scope: 'own' }, { signal: request.signal })
    expect(mocks.getEligibleWeeks).toHaveBeenCalledWith({ signal: request.signal })
  })

  it('redirects current-week timesheet creation to the existing editable sheet', async () => {
    const loader = createTimesheetCreateLoader({
      basePath: '/manager/my-timesheets',
      timesheetScope: 'own',
    })
    mocks.getTimesheets.mockResolvedValue([
      { id: 'ts-1', weekStart: '2026-04-06', status: 'DRAFT' },
    ])

    const result = await loader({ request: createRequest('/manager/my-timesheets/new') })

    expect(result.status).toBe(302)
    expect(result.headers.get('Location')).toBe('/manager/my-timesheets/ts-1/edit')
  })

  it('surfaces a recoverable create-timesheet loader error when the existing-sheet check fails', async () => {
    const request = createRequest('/consultant/timesheets/new')
    const loader = createTimesheetCreateLoader()

    mocks.getTimesheets.mockRejectedValue(new Error('Timesheet lookup unavailable'))

    await expect(loader({ request })).resolves.toEqual({
      weekStart: '2026-04-06',
      error: 'Timesheet lookup unavailable',
    })
    expect(mocks.getTimesheets).toHaveBeenCalledWith({}, { signal: request.signal })
  })

  it('loads editable timesheet data and a preferred assignment id', async () => {
    const request = createRequest('/consultant/timesheets/ts-2/edit')
    const loader = createTimesheetEditLoader()
    const timesheet = { id: 'ts-2', status: 'DRAFT', entries: [] }
    const assignments = [{ id: 'assignment-1', clientName: 'Client A' }]
    const previousTimesheet = {
      id: 'ts-1',
      status: 'COMPLETED',
      weekStart: '2026-03-30',
      workSummary: [
        {
          entryKind: 'CLIENT',
          assignmentId: 'assignment-1',
        },
      ],
    }

    mocks.getTimesheet.mockResolvedValue(timesheet)
    mocks.getAssignments.mockResolvedValue(assignments)
    mocks.getTimesheets.mockResolvedValue([previousTimesheet, timesheet])

    await expect(loader({ params: { id: 'ts-2' }, request })).resolves.toEqual({
      timesheet,
      assignments,
      preferredAssignmentId: 'assignment-1',
      error: null,
    })
  })

  it('keeps assignment loader partial data when one list fails', async () => {
    const users = [{ id: 'user-1', name: 'Admin' }]
    const managerAssignments = [{ id: 'manager-assignment-1' }]

    mocks.getAllAssignments.mockRejectedValue(new Error('Client assignment outage'))
    mocks.getManagerAssignments.mockResolvedValue(managerAssignments)
    mocks.getUsers.mockResolvedValue(users)

    await expect(
      assignmentsLoader({ request: createRequest('/admin/assignments') })
    ).resolves.toEqual({
      clientAssignments: [],
      managerAssignments,
      users,
      clientError: 'Client assignment outage',
      managerError: '',
    })
  })

  it('loads dashboard timesheets through the router loader with request cancellation support', async () => {
    const request = createRequest('/consultant/dashboard')
    const timesheets = [{ id: 'ts-1', status: 'DRAFT' }]

    mocks.getTimesheets.mockResolvedValue(timesheets)

    await expect(consultantDashboardLoader({ request })).resolves.toEqual({
      timesheets,
      error: null,
    })
    expect(mocks.getTimesheets).toHaveBeenCalledWith({}, { signal: request.signal })
  })

  it('keeps partial admin dashboard data when one overview request fails', async () => {
    const users = [{ id: 'user-1', role: 'CONSULTANT' }]

    mocks.getUsers.mockResolvedValue(users)
    mocks.getAuditLog.mockRejectedValue(new Error('Audit service unavailable'))

    await expect(
      adminDashboardLoader({ request: createRequest('/admin/dashboard') })
    ).resolves.toEqual({
      users,
      auditLog: [],
      error: 'Audit service unavailable',
    })
  })

  it('keeps all finance timesheets so the page can derive cross-status summary counts', async () => {
    mocks.getTimesheets.mockResolvedValue([
      { id: 'draft', status: 'DRAFT' },
      { id: 'approved', status: 'APPROVED' },
      { id: 'completed', status: 'COMPLETED' },
    ])

    await expect(
      financeTimesheetListLoader({ request: createRequest('/finance/timesheets') })
    ).resolves.toEqual({
      timesheets: [
        { id: 'draft', status: 'DRAFT' },
        { id: 'approved', status: 'APPROVED' },
        { id: 'completed', status: 'COMPLETED' },
      ],
      error: null,
    })
  })

  it('sorts audit entries newest first', async () => {
    mocks.getAuditLog.mockResolvedValue([
      { id: 'old', createdAt: '2026-04-10T09:00:00.000Z' },
      { id: 'new', createdAt: '2026-04-11T09:00:00.000Z' },
    ])

    await expect(auditLogLoader({ request: createRequest('/admin/audit-log') })).resolves.toEqual({
      entries: [
        { id: 'new', createdAt: '2026-04-11T09:00:00.000Z' },
        { id: 'old', createdAt: '2026-04-10T09:00:00.000Z' },
      ],
      error: '',
    })
  })
})
